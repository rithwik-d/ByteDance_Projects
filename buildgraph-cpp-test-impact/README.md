# BuildGraph — C++ Dependency Graph & Test-Impact Explorer
Independent educational implementation of dependency management and intelligent test selection, **not** ByteDance software and **not** an LLM.

**Stack:** C++20/STL, CMake, Node.js, JavaScript, HTML/CSS, GitHub Actions.

## Build and run
```bash
cmake -S . -B build
cmake --build build -j 2
ctest --test-dir build --output-on-failure
node --test test/*.test.js
node server.js
```
Browse http://127.0.0.1:8084. Works without third-party Node dependencies.

## What it does
- Reads module dependency edges and test coverage links from two synthetic CSV files.
- Reverse graph traversal finds affected downstream modules after a source change.
- Tests mapped to any affected module are recommended for rerun.
- DFS reports dependency back-edges as a simple cycle signal.
- Node service safely invokes the compiled C++ binary (no shell) and renders a small dashboard.

The provided synthetic fixture comprises 96 modules, 95 dependency edges, 240 test cases and 480 coverage links. This is a toy DAG, not a production monorepo graph.


## Verification note
3 CTest + 4 Node.js tests passed; 96 synthetic modules and 240 tests.
