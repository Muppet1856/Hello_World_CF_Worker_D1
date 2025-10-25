-- Delete this file when forking this repo.
-- Create the greetings table to store hello world messages.
CREATE TABLE IF NOT EXISTS greetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL
);

-- Seed the table with the default "Hello World" greeting.
INSERT INTO greetings (message)
SELECT "Hello World"
WHERE NOT EXISTS (
  SELECT 1 FROM greetings
);
