-- New users require admin approval before accessing the app.
-- Admins (by email) are activated immediately.
-- All other users start with is_active = false and appear in the
-- "Wartende Aktivierungen" section of the Admin page.

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  user_email text;
  user_meta jsonb;
  assigned_role app_role;
  user_is_active boolean;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Profile already exists: return current is_active status
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = current_user_id) THEN
    SELECT is_active INTO user_is_active
    FROM public.profiles
    WHERE id = current_user_id;

    RETURN json_build_object(
      'success', true,
      'action', 'existing',
      'is_active', user_is_active
    );
  END IF;

  -- First login: read email and metadata
  SELECT email, raw_user_meta_data
  INTO user_email, user_meta
  FROM auth.users
  WHERE id = current_user_id;

  -- Admins are activated immediately, all others need approval
  IF user_email IN ('office@moebel-eder.at', 'napetschnig.chris@gmail.com', 'office@elektro-brodnig.at') THEN
    assigned_role := 'administrator';
    user_is_active := true;
  ELSE
    assigned_role := 'mitarbeiter';
    user_is_active := false;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, vorname, nachname, is_active)
  VALUES (
    current_user_id,
    COALESCE(user_meta->>'vorname', ''),
    COALESCE(user_meta->>'nachname', ''),
    user_is_active
  );

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'action', 'created',
    'role', assigned_role,
    'is_active', user_is_active
  );
END;
$$;
