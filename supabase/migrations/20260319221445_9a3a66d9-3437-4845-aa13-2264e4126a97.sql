
-- Add course_type and address columns to cours_zoom table
ALTER TABLE public.cours_zoom 
ADD COLUMN course_type text NOT NULL DEFAULT 'zoom',
ADD COLUMN address text DEFAULT '';

-- Add a check constraint via trigger for valid course types
CREATE OR REPLACE FUNCTION public.validate_course_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.course_type NOT IN ('zoom', 'presentiel') THEN
    RAISE EXCEPTION 'Invalid course_type: must be zoom or presentiel';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_course_type_trigger
BEFORE INSERT OR UPDATE ON public.cours_zoom
FOR EACH ROW
EXECUTE FUNCTION public.validate_course_type();
