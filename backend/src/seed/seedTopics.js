const db = require('../db');

const topics = [
  {
    subject_id: 1,
    order_index: 1,
    title: 'Introduction to C',
    content: `## Introduction to C

C is a general-purpose, procedural programming language developed by Dennis Ritchie in 1972 at Bell Labs. It is one of the most widely used languages and forms the foundation of many modern languages.

### Why Learn C?
- It is fast and efficient.
- It gives direct control over memory.
- It is the base for C++, Java, and many others.
- Most operating systems are written in C.

### Structure of a C Program
\`\`\`c
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
\`\`\`

### Key Parts
| Part | Purpose |
|------|---------|
| #include | Includes a library |
| int main() | Entry point of the program |
| printf() | Prints output to screen |
| return 0 | Ends the program |

### Your Task
Write a program that prints your name to the screen.`,
    starter_code: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}`
  },
  {
    subject_id: 1,
    order_index: 2,
    title: 'Variables & Data Types',
    content: `## Variables & Data Types

A variable is a named storage location in memory. Every variable has a data type that defines what kind of value it can hold.

### Common Data Types

| Type | Size | Example |
|------|------|---------|
| int | 4 bytes | int age = 20; |
| float | 4 bytes | float gpa = 3.75; |
| double | 8 bytes | double pi = 3.14159; |
| char | 1 byte | char grade = 'A'; |

### Example
\`\`\`c
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
\`\`\`

### Your Task
Declare variables for your name initial, age, and GPA. Print them all.`,
    starter_code: `#include <stdio.h>\n\nint main() {\n    int age = 21;\n    float gpa = 3.80;\n    char initial = 'A';\n\n    printf("Age: %d\\n", age);\n    printf("GPA: %.2f\\n", gpa);\n    printf("Initial: %c\\n", initial);\n\n    return 0;\n}`
  },
  {
    subject_id: 1,
    order_index: 3,
    title: 'Operators',
    content: `## Operators in C

Operators are symbols that tell the compiler to perform specific operations.

### Arithmetic Operators
| Operator | Meaning | Example |
|----------|---------|---------|
| + | Addition | a + b |
| - | Subtraction | a - b |
| * | Multiplication | a * b |
| / | Division | a / b |
| % | Modulus | a % b |

### Example
\`\`\`c
#include <stdio.h>

int main() {
    int a = 10, b = 3;
    printf("Sum: %d\\n", a + b);
    printf("Remainder: %d\\n", a % b);
    printf("Is a > b? %d\\n", a > b);
    return 0;
}
\`\`\`

### Your Task
Take two numbers and print their sum, difference, product, and remainder.`,
    starter_code: `#include <stdio.h>\n\nint main() {\n    int a = 10, b = 3;\n    printf("Sum: %d\\n", a + b);\n    printf("Difference: %d\\n", a - b);\n    printf("Product: %d\\n", a * b);\n    printf("Remainder: %d\\n", a % b);\n    return 0;\n}`
  },
  {
    subject_id: 1,
    order_index: 4,
    title: 'Input & Output',
    content: `## Input & Output in C

C uses printf() for output and scanf() for input.

### Example
\`\`\`c
#include <stdio.h>

int main() {
    int a, b;
    printf("Enter two numbers: ");
    scanf("%d %d", &a, &b);
    printf("Sum = %d\\n", a + b);
    return 0;
}
\`\`\`

### Your Task
Read two integers from the user and print their sum.`,
    starter_code: `#include <stdio.h>\n\nint main() {\n    int a, b;\n    printf("Enter two numbers: ");\n    scanf("%d %d", &a, &b);\n    printf("Sum = %d\\n", a + b);\n    return 0;\n}`
  },
  {
    subject_id: 1,
    order_index: 5,
    title: 'Conditionals',
    content: `## Conditionals in C

Conditionals let your program make decisions.

### Example
\`\`\`c
#include <stdio.h>

int main() {
    int marks;
    scanf("%d", &marks);

    if (marks >= 80)
        printf("Grade: A\\n");
    else if (marks >= 60)
        printf("Grade: B\\n");
    else
        printf("Fail\\n");

    return 0;
}
\`\`\`

### Your Task
Read a number and print whether it is positive, negative, or zero.`,
    starter_code: `#include <stdio.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n\n    if (n > 0)\n        printf("Positive\\n");\n    else if (n < 0)\n        printf("Negative\\n");\n    else\n        printf("Zero\\n");\n\n    return 0;\n}`
  },
  {
    subject_id: 1,
    order_index: 6,
    title: 'Loops',
    content: `## Loops in C

Loops repeat a block of code multiple times.

### Example
\`\`\`c
#include <stdio.h>

int main() {
    for (int i = 1; i <= 5; i++) {
        printf("%d\\n", i);
    }
    return 0;
}
\`\`\`

### Your Task
Print the multiplication table of a number entered by the user.`,
    starter_code: `#include <stdio.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    for (int i = 1; i <= 10; i++) {\n        printf("%d x %d = %d\\n", n, i, n * i);\n    }\n    return 0;\n}`
  },
  {
    subject_id: 1,
    order_index: 7,
    title: 'Functions',
    content: `## Functions in C

A function is a reusable block of code that performs a specific task.

### Example
\`\`\`c
#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int main() {
    printf("Sum = %d\\n", add(5, 3));
    return 0;
}
\`\`\`

### Recursion
\`\`\`c
int factorial(int n) {
    if (n == 0) return 1;
    return n * factorial(n - 1);
}
\`\`\`

### Your Task
Write a function that takes two numbers and returns the larger one.`,
    starter_code: `#include <stdio.h>\n\nint maxOf(int a, int b) {\n    if (a > b) return a;\n    return b;\n}\n\nint main() {\n    int x, y;\n    scanf("%d %d", &x, &y);\n    printf("Max = %d\\n", maxOf(x, y));\n    return 0;\n}`
  },
  {
    subject_id: 1,
    order_index: 8,
    title: 'Arrays',
    content: `## Arrays in C

An array stores multiple values of the same type in a single variable.

### Example
\`\`\`c
#include <stdio.h>

int main() {
    int arr[5] = {10, 20, 30, 40, 50};
    int sum = 0;

    for (int i = 0; i < 5; i++) {
        sum += arr[i];
    }

    printf("Sum = %d\\n", sum);
    return 0;
}
\`\`\`

### Your Task
Read 5 numbers into an array and print the largest one.`,
    starter_code: `#include <stdio.h>\n\nint main() {\n    int arr[5];\n    for (int i = 0; i < 5; i++) scanf("%d", &arr[i]);\n    int max = arr[0];\n    for (int i = 1; i < 5; i++) if (arr[i] > max) max = arr[i];\n    printf("Max = %d\\n", max);\n    return 0;\n}`
  },
  {
    subject_id: 1,
    order_index: 9,
    title: 'Strings',
    content: `## Strings in C

A string is an array of characters ending with null character.

### Example
\`\`\`c
#include <stdio.h>
#include <string.h>

int main() {
    char name[50];
    scanf("%s", name);
    printf("Hello, %s! Length: %lu\\n", name, strlen(name));
    return 0;
}
\`\`\`

### Your Task
Read a string and print it in reverse.`,
    starter_code: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char str[100];\n    scanf("%s", str);\n    int len = strlen(str);\n    for (int i = len - 1; i >= 0; i--) printf("%c", str[i]);\n    printf("\\n");\n    return 0;\n}`
  },
  {
    subject_id: 1,
    order_index: 10,
    title: 'Pointers',
    content: `## Pointers in C

A pointer stores the memory address of another variable.

### Example
\`\`\`c
#include <stdio.h>

int main() {
    int x = 42;
    int *ptr = &x;
    printf("Value: %d\\n", *ptr);
    *ptr = 100;
    printf("New value: %d\\n", x);
    return 0;
}
\`\`\`

### Your Task
Write a function that swaps two numbers using pointers.`,
    starter_code: `#include <stdio.h>\n\nvoid swap(int *a, int *b) {\n    int temp = *a;\n    *a = *b;\n    *b = temp;\n}\n\nint main() {\n    int x = 5, y = 10;\n    swap(&x, &y);\n    printf("x = %d, y = %d\\n", x, y);\n    return 0;\n}`
  },
  {
    subject_id: 1,
    order_index: 11,
    title: 'Structures',
    content: `## Structures in C

A structure groups related variables of different types under one name.

### Example
\`\`\`c
#include <stdio.h>

typedef struct {
    char name[50];
    int roll;
    float gpa;
} Student;

int main() {
    Student s;
    scanf("%s %d %f", s.name, &s.roll, &s.gpa);
    printf("Name: %s, Roll: %d, GPA: %.2f\\n", s.name, s.roll, s.gpa);
    return 0;
}
\`\`\`

### Your Task
Create a structure for a Book with title, author, and price.`,
    starter_code: `#include <stdio.h>\n\ntypedef struct {\n    char title[100];\n    char author[50];\n    float price;\n} Book;\n\nint main() {\n    Book b;\n    scanf("%s %s %f", b.title, b.author, &b.price);\n    printf("Title: %s\\nAuthor: %s\\nPrice: %.2f\\n", b.title, b.author, b.price);\n    return 0;\n}`
  },
  {
    subject_id: 1,
    order_index: 12,
    title: 'File I/O',
    content: `## File Input/Output in C

C allows you to read from and write to files using file pointers.

### Example
\`\`\`c
#include <stdio.h>

int main() {
    FILE *fp = fopen("output.txt", "w");
    if (fp == NULL) { printf("Error!\\n"); return 1; }
    fprintf(fp, "Hello from CoolOJ!\\n");
    fclose(fp);
    printf("File written successfully.\\n");
    return 0;
}
\`\`\`

### Your Task
Write a program that reads a number from a file and prints its square.`,
    starter_code: `#include <stdio.h>\n\nint main() {\n    FILE *fp = fopen("output.txt", "w");\n    if (fp == NULL) { printf("Error!\\n"); return 1; }\n    fprintf(fp, "Learning File I/O\\n");\n    fclose(fp);\n    printf("Done.\\n");\n    return 0;\n}`
  }
];

async function seed() {
  try {
    console.log('Seeding learn_topics...');
    for (const topic of topics) {
      await db.query(
        `INSERT INTO learn_topics (subject_id, order_index, title, content, starter_code)
         VALUES (?, ?, ?, ?, ?)`,
        [topic.subject_id, topic.order_index, topic.title, topic.content, topic.starter_code]
      );
      console.log(`  ✅ Inserted: ${topic.title}`);
    }
    console.log('Done! All 12 topics seeded.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();