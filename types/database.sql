CREATE TABLE public.learning (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user bigint NOT NULL,
  word bigint NOT NULL,
  score numeric NOT NULL,
  last_review timestamp without time zone NOT NULL,
  training bigint NOT NULL,
  translation bigint NOT NULL,
  CONSTRAINT learning_pkey PRIMARY KEY (id),
  CONSTRAINT learning_translation_fkey FOREIGN KEY (translation) REFERENCES public.words_translations(id),
  CONSTRAINT learning_word_fkey FOREIGN KEY (word) REFERENCES public.words(id),
  CONSTRAINT learning_user_fkey FOREIGN KEY (user) REFERENCES public.users(id),
  CONSTRAINT learning_training_fkey FOREIGN KEY (training) REFERENCES public.trainings(id)
);
CREATE TABLE public.topics (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  description text NOT NULL,
  catalog bigint NOT NULL,
  image text,
  CONSTRAINT topics_pkey PRIMARY KEY (id),
  CONSTRAINT topics_catalog_fkey FOREIGN KEY (catalog) REFERENCES public.vocab_catalogs(id)
);
CREATE TABLE public.trainings (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  image text NOT NULL,
  score numeric NOT NULL,
  CONSTRAINT trainings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  name text NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.vocab_catalogs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  owner bigint NOT NULL,
  title text NOT NULL,
  description text,
  language text NOT NULL,
  image text,
  CONSTRAINT vocab_catalogs_pkey PRIMARY KEY (id),
  CONSTRAINT vocab_catalogs_owner_fkey FOREIGN KEY (owner) REFERENCES public.users(id)
);
CREATE TABLE public.words (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  topic bigint NOT NULL,
  catalog bigint NOT NULL,
  language text NOT NULL,
  CONSTRAINT words_pkey PRIMARY KEY (id),
  CONSTRAINT words_catalog_fkey FOREIGN KEY (catalog) REFERENCES public.vocab_catalogs(id),
  CONSTRAINT words_topic_fkey FOREIGN KEY (topic) REFERENCES public.topics(id)
);
CREATE TABLE public.words_translations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  word bigint NOT NULL,
  translation text NOT NULL,
  language text NOT NULL,
  CONSTRAINT words_translations_pkey PRIMARY KEY (id),
  CONSTRAINT words_translations_word_fkey FOREIGN KEY (word) REFERENCES public.words(id)
);