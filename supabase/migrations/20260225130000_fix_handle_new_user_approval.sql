-- Fix handle_new_user trigger to require admin approval for new users.
-- Previously this trigger set is_active = true for everyone.
-- Now only whitelisted admin emails get is_active = true immediately.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assigned_role app_role;
  user_is_active boolean;
BEGIN
  -- Whitelisted admin emails are activated immediately
  IF NEW.email IN (
    'office@moebel-eder.at',
    'napetschnig.chris@gmail.com',
    'office@elektro-brodnig.at',
    'hallo@epowergmbh.at'
  ) THEN
    assigned_role := 'administrator';
    user_is_active := true;
  ELSE
    assigned_role := 'mitarbeiter';
    user_is_active := false;
  END IF;

  INSERT INTO public.profiles (id, vorname, nachname, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'vorname', ''),
    COALESCE(NEW.raw_user_meta_data->>'nachname', ''),
    user_is_active
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;
