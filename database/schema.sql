USE CoolOJ;

INSERT INTO subjects (name, semester_no)
VALUES ('Data Structures and Algorithms', 3);

INSERT INTO problems (
  title,
  statement,
  input_format,
  output_format,
  constraints,
  difficulty,
  time_limit_ms,
  memory_limit_kb,
  subject_id,
  is_public
)
VALUES (
  'A + B',
  'Given two integers A and B, print their sum.',
  'Two integers A and B.',
  'Print A + B.',
  '1 <= A, B <= 10^9',
  'Easy',
  1000,
  262144,
  1,
  true
);

INSERT INTO test_cases (problem_id, input, expected_output, is_sample)
VALUES
  (1, '2 3', '5', true),
  (1, '10 20', '30', false);