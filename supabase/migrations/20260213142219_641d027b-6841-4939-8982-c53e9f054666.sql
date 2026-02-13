
-- Profiles table for teacher info
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  school_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Classes
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2024/2025',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own classes" ON public.classes FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- Students
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  parent_name TEXT NOT NULL DEFAULT '',
  parent_email TEXT NOT NULL DEFAULT '',
  parent_phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own students" ON public.students FOR ALL
  USING (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = students.class_id AND classes.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = students.class_id AND classes.teacher_id = auth.uid()));

-- Terms
CREATE TABLE public.terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Term 1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own terms" ON public.terms FOR ALL
  USING (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = terms.class_id AND classes.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = terms.class_id AND classes.teacher_id = auth.uid()));

-- Weeks
CREATE TABLE public.weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own weeks" ON public.weeks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.terms t JOIN public.classes c ON c.id = t.class_id
    WHERE t.id = weeks.term_id AND c.teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.terms t JOIN public.classes c ON c.id = t.class_id
    WHERE t.id = weeks.term_id AND c.teacher_id = auth.uid()
  ));

-- Lessons
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id UUID NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own lessons" ON public.lessons FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.weeks w JOIN public.terms t ON t.id = w.term_id JOIN public.classes c ON c.id = t.class_id
    WHERE w.id = lessons.week_id AND c.teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.weeks w JOIN public.terms t ON t.id = w.term_id JOIN public.classes c ON c.id = t.class_id
    WHERE w.id = lessons.week_id AND c.teacher_id = auth.uid()
  ));

-- Learning Outcomes
CREATE TABLE public.outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own outcomes" ON public.outcomes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.weeks w ON w.id = l.week_id JOIN public.terms t ON t.id = w.term_id JOIN public.classes c ON c.id = t.class_id
    WHERE l.id = outcomes.lesson_id AND c.teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.weeks w ON w.id = l.week_id JOIN public.terms t ON t.id = w.term_id JOIN public.classes c ON c.id = t.class_id
    WHERE l.id = outcomes.lesson_id AND c.teacher_id = auth.uid()
  ));

-- Assessments
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  outcome_id UUID REFERENCES public.outcomes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Classwork',
  total_score NUMERIC NOT NULL DEFAULT 100,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own assessments" ON public.assessments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = assessments.class_id AND classes.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = assessments.class_id AND classes.teacher_id = auth.uid()));

-- Student Scores
CREATE TABLE public.student_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, student_id)
);
ALTER TABLE public.student_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own scores" ON public.student_scores FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.assessments a JOIN public.classes c ON c.id = a.class_id
    WHERE a.id = student_scores.assessment_id AND c.teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assessments a JOIN public.classes c ON c.id = a.class_id
    WHERE a.id = student_scores.assessment_id AND c.teacher_id = auth.uid()
  ));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
