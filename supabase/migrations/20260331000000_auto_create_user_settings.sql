-- Auto-create user_settings row when a new user signs up.
-- Previously, user_settings was only created when the user changed calendar preferences,
-- meaning new users had no row and is_premium defaulted to false via app logic.
-- This trigger ensures every user always has a settings row from the moment they sign up.

CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_settings();
