-- Create a session table for custom cookie-based authentication
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nisnip text NOT NULL,
  token text NOT NULL UNIQUE,
  expired_at timestamp NOT NULL
);
