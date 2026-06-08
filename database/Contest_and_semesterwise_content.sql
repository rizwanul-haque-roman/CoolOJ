USE CoolOJ;

-- ─────────────────────────────────────────
-- CONTEST TABLES
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contests (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  start_time    DATETIME NOT NULL,
  end_time      DATETIME NOT NULL,
  created_by    INT NOT NULL,
  is_public     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS contest_problems (
  contest_id    INT NOT NULL,
  problem_id    INT NOT NULL,
  label         VARCHAR(5) NOT NULL DEFAULT 'A',
  PRIMARY KEY (contest_id, problem_id),
  FOREIGN KEY (contest_id) REFERENCES contests(id),
  FOREIGN KEY (problem_id) REFERENCES problems(id)
);

CREATE TABLE IF NOT EXISTS contest_registrations (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  contest_id    INT NOT NULL,
  user_id       INT NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_registration (contest_id, user_id),
  FOREIGN KEY (contest_id) REFERENCES contests(id),
  FOREIGN KEY (user_id)    REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS contest_submissions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  contest_id    INT NOT NULL,
  problem_id    INT NOT NULL,
  user_id       INT NOT NULL,
  language      VARCHAR(50),
  source_code   TEXT,
  verdict       VARCHAR(50) DEFAULT 'Pending',
  score         INT DEFAULT 0,
  submitted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contest_id) REFERENCES contests(id),
  FOREIGN KEY (problem_id) REFERENCES problems(id),
  FOREIGN KEY (user_id)    REFERENCES users(id)
);

-- ─────────────────────────────────────────
-- SEMESTER LEARNING TABLES
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS semesters (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  number        INT NOT NULL UNIQUE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  is_active     BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS semester_subjects (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  semester_id     INT NOT NULL,
  name            VARCHAR(255) NOT NULL,
  language        VARCHAR(50),
  description     TEXT,
  is_placeholder  BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (semester_id) REFERENCES semesters(id)
);

CREATE TABLE IF NOT EXISTS learn_topics (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  subject_id    INT NOT NULL,
  order_index   INT NOT NULL DEFAULT 0,
  title         VARCHAR(255) NOT NULL,
  content       LONGTEXT,
  starter_code  TEXT,
  FOREIGN KEY (subject_id) REFERENCES semester_subjects(id)
);

CREATE TABLE IF NOT EXISTS topic_progress (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  topic_id      INT NOT NULL,
  completed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_progress (user_id, topic_id),
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (topic_id) REFERENCES learn_topics(id)
);

-- ─────────────────────────────────────────
-- SEED: ALL 6 SEMESTERS
-- ─────────────────────────────────────────

INSERT INTO semesters (number, title, description, is_active) VALUES
(1, 'Semester 1', 'Foundations of programming using C language.', TRUE),
(2, 'Semester 2', 'Object Oriented Programming using C++.', TRUE),
(3, 'Semester 3', 'Data Structures, Database Systems, and Algorithms.', TRUE),
(4, 'Semester 4', 'Web Engineering, Operating Systems, Compiler Design.', TRUE),
(5, 'Semester 5', 'Software Engineering, Computer Networks, Microprocessor.', TRUE),
(6, 'Semester 6', 'Artificial Intelligence and Computer Graphics.', TRUE);

-- ─────────────────────────────────────────
-- SEED: SUBJECTS
-- ─────────────────────────────────────────

INSERT INTO semester_subjects (semester_id, name, language, description, is_placeholder) VALUES
-- Semester 1
(1, 'Computer Programming in C', 'c', 'Learn the fundamentals of programming using the C language.', FALSE),
-- Semester 2
(2, 'Object Oriented Programming', 'cpp', 'Master OOP concepts using C++.', TRUE),
-- Semester 3
(3, 'Data Structures', 'c', 'Arrays, linked lists, stacks, queues, trees, graphs.', TRUE),
(3, 'Database Systems', 'sql', 'Relational databases, SQL, normalization.', TRUE),
(3, 'Algorithms', 'c', 'Sorting, searching, dynamic programming, graph algorithms.', TRUE),
-- Semester 4
(4, 'Web Engineering', 'javascript', 'HTML, CSS, JavaScript, frontend and backend basics.', TRUE),
(4, 'Operating Systems', 'c', 'Processes, threads, memory management, file systems.', TRUE),
(4, 'Compiler Design', 'c', 'Lexical analysis, parsing, code generation.', TRUE),
-- Semester 5
(5, 'Software Engineering', NULL, 'SDLC, design patterns, testing, project management.', TRUE),
(5, 'Computer Networks', 'c', 'OSI model, TCP/IP, routing, protocols.', TRUE),
(5, 'Microprocessor & Assembly', 'asm', '8086 architecture, assembly language programming.', TRUE),
-- Semester 6
(6, 'Artificial Intelligence', 'python', 'Search algorithms, knowledge representation, ML basics.', TRUE),
(6, 'Computer Graphics', 'c', 'Transformations, rendering, OpenGL basics.', TRUE);

-- ─────────────────────────────────────────
-- SEED: SEMESTER 1 TOPICS (C Programming)
-- subject_id = 1
-- ─────────────────────────────────────────

INSERT INTO learn_topics (subject_id, order_index, title, content, starter_code) VALUES

(1, 1, 'Introduction to C',
'## Introduction to C

C is a general-purpose, procedural programming language developed by Dennis Ritchie in 1972 at Bell Labs. It is one of the most widely used languages and forms the foundation of many modern languages.

### Why Learn C?
- It is fast and efficient.
- It gives direct control over memory.
- It is the base for C++, Java, and many others.
- Most operating systems are written in C.

### Structure of a C Program

```c
#include <stdio.h>   // Header file for input/output

int main() {         // Main function — execution starts here
    printf("Hello, World!\\n");  // Print to screen
    return 0;        // Return 0 means success
}
```

### Key Parts
| Part | Purpose |
|------|---------|
| `#include` | Includes a library |
| `int main()` | Entry point of the program |
| `printf()` | Prints output to screen |
| `return 0` | Ends the program |

### Your Task
Write a program that prints your name to the screen.',
'#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}'),

(1, 2, 'Variables & Data Types',
'## Variables & Data Types

A **variable** is a named storage location in memory. Every variable has a **data type** that defines what kind of value it can hold.

### Common Data Types

| Type | Size | Example |
|------|------|---------|
| `int` | 4 bytes | `int age = 20;` |
| `float` | 4 bytes | `float gpa = 3.75;` |
| `double` | 8 bytes | `double pi = 3.14159;` |
| `char` | 1 byte | `char grade = 'A';` |

### Rules for Variable Names
- Must start with a letter or underscore
- Cannot use reserved keywords like `int`, `return`
- Case-sensitive: `Age` and `age` are different

### Example

```c
#include <stdio.h>

int main() {
    int age = 21;
    float gpa = 3.8;
    char grade = 'A';

    printf("Age: %d\\n", age);
    printf("GPA: %.2f\\n", gpa);
    printf("Grade: %c\\n", grade);

    return 0;
}
```

### Format Specifiers
| Specifier | Type |
|-----------|------|
| `%d` | int |
| `%f` | float |
| `%lf` | double |
| `%c` | char |
| `%s` | string |

### Your Task
Declare variables for your name initial, age, and GPA. Print them all.',
'#include <stdio.h>

int main() {
    int age = 21;
    float gpa = 3.80;
    char initial = 'A';

    printf("Age: %d\\n", age);
    printf("GPA: %.2f\\n", gpa);
    printf("Initial: %c\\n", initial);

    return 0;
}'),

(1, 3, 'Operators',
'## Operators in C

Operators are symbols that tell the compiler to perform specific operations.

### Arithmetic Operators
| Operator | Meaning | Example |
|----------|---------|---------|
| `+` | Addition | `a + b` |
| `-` | Subtraction | `a - b` |
| `*` | Multiplication | `a * b` |
| `/` | Division | `a / b` |
| `%` | Modulus (remainder) | `a % b` |

### Relational Operators
Used to compare values. Returns 1 (true) or 0 (false).
`==`, `!=`, `>`, `<`, `>=`, `<=`

### Logical Operators
| Operator | Meaning |
|----------|---------|
| `&&` | AND |
| `\|\|` | OR |
| `!` | NOT |

### Example

```c
#include <stdio.h>

int main() {
    int a = 10, b = 3;

    printf("Sum: %d\\n", a + b);
    printf("Remainder: %d\\n", a % b);
    printf("Is a > b? %d\\n", a > b);

    return 0;
}
```

### Your Task
Take two numbers and print their sum, difference, product, and remainder.',
'#include <stdio.h>

int main() {
    int a = 10, b = 3;

    printf("Sum: %d\\n", a + b);
    printf("Difference: %d\\n", a - b);
    printf("Product: %d\\n", a * b);
    printf("Remainder: %d\\n", a % b);

    return 0;
}'),

(1, 4, 'Input & Output',
'## Input & Output in C

C uses `printf()` for output and `scanf()` for input.

### printf()
```c
printf("format string", variables);
```

### scanf()
```c
scanf("format string", &variable);
```
The `&` symbol gives the **address** of the variable so scanf knows where to store the value.

### Example

```c
#include <stdio.h>

int main() {
    int age;
    char name;

    printf("Enter your name: ");
    scanf("%s", name);

    printf("Enter your age: ");
    scanf("%d", &age);

    printf("Hello %s, you are %d years old.\\n", name, age);

    return 0;
}
```

### Your Task
Read two integers from the user and print their sum.',
'#include <stdio.h>

int main() {
    int a, b;

    printf("Enter two numbers: ");
    scanf("%d %d", &a, &b);

    printf("Sum = %d\\n", a + b);

    return 0;
}'),

(1, 5, 'Conditionals',
'## Conditionals in C

Conditionals let your program make decisions.

### if / else
```c
if (condition) {
    // runs if true
} else {
    // runs if false
}
```

### else if
```c
if (marks >= 80) {
    printf("A");
} else if (marks >= 60) {
    printf("B");
} else {
    printf("C");
}
```

### switch
```c
switch (day) {
    case 1: printf("Monday"); break;
    case 2: printf("Tuesday"); break;
    default: printf("Other");
}
```

### Example

```c
#include <stdio.h>

int main() {
    int marks;
    scanf("%d", &marks);

    if (marks >= 80)
        printf("Grade: A\\n");
    else if (marks >= 60)
        printf("Grade: B\\n");
    else if (marks >= 40)
        printf("Grade: C\\n");
    else
        printf("Fail\\n");

    return 0;
}
```

### Your Task
Read a number and print whether it is positive, negative, or zero.',
'#include <stdio.h>

int main() {
    int n;
    scanf("%d", &n);

    if (n > 0)
        printf("Positive\\n");
    else if (n < 0)
        printf("Negative\\n");
    else
        printf("Zero\\n");

    return 0;
}'),

(1, 6, 'Loops',
'## Loops in C

Loops repeat a block of code multiple times.

### for loop
```c
for (init; condition; update) {
    // body
}
```

### while loop
```c
while (condition) {
    // body
}
```

### do-while loop
Runs at least once even if condition is false.
```c
do {
    // body
} while (condition);
```

### break & continue
- `break` — exits the loop immediately
- `continue` — skips the current iteration

### Example

```c
#include <stdio.h>

int main() {
    // Print 1 to 5
    for (int i = 1; i <= 5; i++) {
        printf("%d\\n", i);
    }

    // Sum of first 10 numbers
    int sum = 0, i = 1;
    while (i <= 10) {
        sum += i;
        i++;
    }
    printf("Sum = %d\\n", sum);

    return 0;
}
```

### Your Task
Print the multiplication table of a number entered by the user.',
'#include <stdio.h>

int main() {
    int n;
    scanf("%d", &n);

    for (int i = 1; i <= 10; i++) {
        printf("%d x %d = %d\\n", n, i, n * i);
    }

    return 0;
}'),

(1, 7, 'Functions',
'## Functions in C

A function is a reusable block of code that performs a specific task.

### Syntax
```c
return_type function_name(parameters) {
    // body
    return value;
}
```

### Why Use Functions?
- Avoids code repetition
- Makes code easier to read
- Allows code reuse

### Example

```c
#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

void greet(char name[]) {
    printf("Hello, %s!\\n", name);
}

int main() {
    int result = add(5, 3);
    printf("Sum = %d\\n", result);

    greet("Alice");

    return 0;
}
```

### Recursion
A function that calls itself.

```c
int factorial(int n) {
    if (n == 0) return 1;
    return n * factorial(n - 1);
}
```

### Your Task
Write a function that takes two numbers and returns the larger one.',
'#include <stdio.h>

int maxOf(int a, int b) {
    if (a > b) return a;
    return b;
}

int main() {
    int x, y;
    scanf("%d %d", &x, &y);
    printf("Max = %d\\n", maxOf(x, y));
    return 0;
}'),

(1, 8, 'Arrays',
'## Arrays in C

An array stores multiple values of the same type in a single variable.

### Declaration
```c
int marks;                     // array of 5 integers
int scores = {90, 85, 78, 92, 88};  // with initialization
```

### Accessing Elements
```c
scores  // first element
scores  // last element (index starts at 0)
```

### Traversal
```c
for (int i = 0; i < 5; i++) {
    printf("%d\\n", scores[i]);
}
```

### 2D Arrays
```c
int matrix = {
    {1, 2, 3},
    {4, 5, 6},
    {7, 8, 9}
};
```

### Example

```c
#include <stdio.h>

int main() {
    int arr = {10, 20, 30, 40, 50};
    int sum = 0;

    for (int i = 0; i < 5; i++) {
        sum += arr[i];
    }

    printf("Sum = %d\\n", sum);
    printf("Average = %.2f\\n", sum / 5.0);

    return 0;
}
```

### Your Task
Read 5 numbers into an array and print the largest one.',
'#include <stdio.h>

int main() {
    int arr[5];

    for (int i = 0; i < 5; i++) {
        scanf("%d", &arr[i]);
    }

    int max = arr[0];
    for (int i = 1; i < 5; i++) {
        if (arr[i] > max) max = arr[i];
    }

    printf("Max = %d\\n", max);
    return 0;
}'),

(1, 9, 'Strings',
'## Strings in C

A string in C is an array of characters ending with a null character `\\0`.

### Declaration
```c
char name;
char greeting[] = "Hello";
```

### Common String Functions (string.h)
| Function | Purpose |
|----------|---------|
| `strlen(s)` | Length of string |
| `strcpy(dest, src)` | Copy string |
| `strcmp(s1, s2)` | Compare strings |
| `strcat(s1, s2)` | Concatenate |

### Example

```c
#include <stdio.h>
#include <string.h>

int main() {
    char name;

    printf("Enter your name: ");
    scanf("%s", name);

    printf("Hello, %s!\\n", name);
    printf("Length: %lu\\n", strlen(name));

    return 0;
}
```

### Your Task
Read a string and print it in reverse.',
'#include <stdio.h>
#include <string.h>

int main() {
    char str[100];
    scanf("%s", str);

    int len = strlen(str);
    for (int i = len - 1; i >= 0; i--) {
        printf("%c", str[i]);
    }
    printf("\\n");

    return 0;
}'),

(1, 10, 'Pointers',
'## Pointers in C

A pointer stores the **memory address** of another variable.

### Declaration
```c
int x = 10;
int *ptr = &x;  // ptr stores address of x
```

### Operators
- `&` — address-of operator
- `*` — dereference operator (get value at address)

### Example

```c
#include <stdio.h>

int main() {
    int x = 42;
    int *ptr = &x;

    printf("Value of x: %d\\n", x);
    printf("Address of x: %p\\n", ptr);
    printf("Value via pointer: %d\\n", *ptr);

    *ptr = 100;  // change x through pointer
    printf("New value of x: %d\\n", x);

    return 0;
}
```

### Why Pointers?
- Pass large data to functions efficiently
- Dynamic memory allocation
- Build data structures like linked lists

### Your Task
Write a function that swaps two numbers using pointers.',
'#include <stdio.h>

void swap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int x = 5, y = 10;
    swap(&x, &y);
    printf("x = %d, y = %d\\n", x, y);
    return 0;
}'),

(1, 11, 'Structures',
'## Structures in C

A structure groups related variables of different types under one name.

### Declaration
```c
struct Student {
    char name;
    int age;
    float gpa;
};
```

### Using a Structure
```c
struct Student s1;
s1.age = 21;
```

### typedef
```c
typedef struct {
    char name;
    int age;
} Student;

Student s1;
```

### Example

```c
#include <stdio.h>

typedef struct {
    char name;
    int roll;
    float gpa;
} Student;

int main() {
    Student s;

    printf("Enter name: ");
    scanf("%s", s.name);
    printf("Enter roll: ");
    scanf("%d", &s.roll);
    printf("Enter GPA: ");
    scanf("%f", &s.gpa);

    printf("\\nStudent Info:\\n");
    printf("Name: %s\\n", s.name);
    printf("Roll: %d\\n", s.roll);
    printf("GPA: %.2f\\n", s.gpa);

    return 0;
}
```

### Your Task
Create a structure for a Book with title, author, and price. Read and display its details.',
'#include <stdio.h>

typedef struct {
    char title[100];
    char author[50];
    float price;
} Book;

int main() {
    Book b;
    scanf("%s %s %f", b.title, b.author, &b.price);
    printf("Title: %s\\nAuthor: %s\\nPrice: %.2f\\n", b.title, b.author, b.price);
    return 0;
}'),

(1, 12, 'File I/O',
'## File Input/Output in C

C allows you to read from and write to files using file pointers.

### Opening a File
```c
FILE *fp = fopen("filename.txt", "mode");
```

| Mode | Meaning |
|------|---------|
| `"r"` | Read |
| `"w"` | Write (creates/overwrites) |
| `"a"` | Append |

### Writing to a File
```c
fprintf(fp, "Hello File!\\n");
```

### Reading from a File
```c
fscanf(fp, "%s", buffer);
```

### Always Close the File
```c
fclose(fp);
```

### Example

```c
#include <stdio.h>

int main() {
    FILE *fp = fopen("output.txt", "w");

    if (fp == NULL) {
        printf("Error opening file!\\n");
        return 1;
    }

    fprintf(fp, "Hello from CoolOJ!\\n");
    fclose(fp);

    printf("File written successfully.\\n");
    return 0;
}
```

### Your Task
Write a program that reads a number from a file and prints its square.',
'#include <stdio.h>

int main() {
    FILE *fp = fopen("output.txt", "w");
    if (fp == NULL) { printf("Error!\\n"); return 1; }
    fprintf(fp, "Learning File I/O in C\\n");
    fclose(fp);
    printf("Done.\\n");
    return 0;
}');