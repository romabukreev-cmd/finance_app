-- Календарь публикаций (модуль /publications). Применено на проде 2026-09-21.
CREATE TABLE IF NOT EXISTS pub_channels (
  id text PRIMARY KEY,
  name text NOT NULL,
  lang text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  target_duration text NOT NULL DEFAULT '',
  hint text NOT NULL DEFAULT '',
  plan_weekdays int[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS pub_cells (
  channel_id text NOT NULL REFERENCES pub_channels(id) ON DELETE CASCADE,
  day date NOT NULL,
  planned boolean,
  done boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, day)
);
GRANT ALL ON pub_channels, pub_cells TO finapp;
