# IDE AI Agent: Coding Excellence Rulebook

**Version**: 1.0  
**Last Updated**: January 2026  
**Purpose**: Executable do's and don'ts rules for AI agents to avoid hallucinations, context loss, bad coding decisions, and junior mistakes. Complements the Coding Excellence Guidebook.

---

## Table of Contents

1. [Universal Rules (Apply to All Domains)](#universal-rules-apply-to-all-domains)
2. [Domain 1: Code Quality & Maintainability](#domain-1-code-quality--maintainability-dos--donts)
3. [Domain 2: System Architecture](#domain-2-system-architecture-dos--donts)
4. [Domain 3: Test-Driven Development](#domain-3-test-driven-development-dos--donts)
5. [Domain 4: Performance & Optimization](#domain-4-performance--optimization-dos--donts)
6. [Domain 5: Design Patterns & Reusability](#domain-5-design-patterns--reusability-dos--donts)
7. [Code Evolution & Lifecycle Rules](#code-evolution--lifecycle-rules)
8. [Documentation Rules](#documentation-rules)
9. [Logging & Debugging Rules](#logging--debugging-rules)
10. [Regression Testing Rules](#regression-testing-rules)
11. [Context & Hallucination Prevention](#context--hallucination-prevention)
12. [Common Mistakes to Avoid](#common-mistakes-to-avoid)

---

## Universal Rules (Apply to All Domains)

### U1: Code is a Communication Medium

**DO**:
- ✅ Write code assuming the next reader is a tired developer at 5 PM on Friday
- ✅ Use clear, searchable names everywhere (no abbreviations unless universal)
- ✅ Structure code to tell a story; dependencies should be obvious
- ✅ Prefer explicit over implicit; better to be verbose than ambiguous
- ✅ Add comments explaining *why* decisions were made, not *what* code does

**DON'T**:
- ❌ Write "clever" code that requires mental gymnastics to understand
- ❌ Use abbreviations (u, usr, cfg, arr) unless they're universal (i, j for loops)
- ❌ Leave code in a state where "I'll document later" (you won't)
- ❌ Trust that "the code is self-documenting" (it never is)
- ❌ Write comments that restate the code; comments should add knowledge

---

### U2: Zero Tolerance for Silent Failures

**DO**:
- ✅ Always throw errors explicitly; never silently return null or undefined
- ✅ Catch exceptions only if you handle them; otherwise, re-throw with context
- ✅ Log the full error (message, stack, context) before bubbling up
- ✅ Return structured results with success/failure flags and reasons
- ✅ Use Try-Catch-Log-Handle pattern consistently

**DON'T**:
- ❌ Catch errors and do nothing: `try { } catch (err) { }`
- ❌ Return null without explanation; use typed errors instead
- ❌ Assume "it will never fail"; handle edge cases explicitly
- ❌ Swallow exceptions in async code; always await and handle
- ❌ Use generic Error; create domain-specific exceptions

**Example**:
```javascript
// ❌ DON'T: Silent failure
function getUser(id) {
  try {
    return database.find(id);
  } catch (err) {
    // Silently returns undefined; caller has no idea what happened
  }
}

// ✅ DO: Explicit error handling with context
function getUser(id) {
  try {
    const user = database.find(id);
    if (!user) {
      throw new UserNotFoundException(`User ${id} not found in database`);
    }
    return user;
  } catch (err) {
    logger.error('Failed to fetch user', { userId: id, error: err });
    throw new UserServiceError(`Could not retrieve user: ${err.message}`, err);
  }
}
```

---

### U3: Every Line Must Have a Purpose

**DO**:
- ✅ Every function should serve one clear purpose
- ✅ Every variable should be used; remove unused variables
- ✅ Every parameter should be necessary; don't accept unused args
- ✅ Every conditional should make business sense; not just "defensive programming"
- ✅ Every dependency should be documented (why it's needed)

**DON'T**:
- ❌ Include "just in case" parameters that aren't used
- ❌ Add variables and forget to use them
- ❌ Write defensive code that defends against impossible scenarios
- ❌ Import modules you don't use
- ❌ Keep old code commented out "for reference"

**Rule**: If you can't explain in one sentence why a line exists, remove it or refactor.

---

### U4: Security First, Always

**DO**:
- ✅ Validate all inputs (type, length, format, range)
- ✅ Sanitize user-supplied strings before using in queries or rendering
- ✅ Use parameterized queries (never string concatenation for SQL)
- ✅ Authenticate and authorize every endpoint/function
- ✅ Assume data in transit can be intercepted; encrypt sensitive data
- ✅ Never log passwords, tokens, or secrets
- ✅ Use environment variables for secrets; never hardcode

**DON'T**:
- ❌ Trust user input; always validate and sanitize
- ❌ Build SQL/queries by string concatenation
- ❌ Log sensitive data (passwords, API keys, personal info)
- ❌ Store secrets in version control
- ❌ Return detailed error messages that leak system info to attackers
- ❌ Skip authentication/authorization "for now"

**Example**:
```javascript
// ❌ DON'T: Multiple security issues
function getUser(id) {
  const query = `SELECT * FROM users WHERE id = ${id}`;  // SQL injection!
  return database.query(query);
}

// ✅ DO: Secure
function getUser(id) {
  // Validate input
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('User ID must be a positive integer');
  }
  
  // Parameterized query
  const query = 'SELECT * FROM users WHERE id = ?';
  return database.query(query, [id]);
}
```

---

### U5: Never Break Existing Tests

**DO**:
- ✅ Run full test suite before committing changes
- ✅ If a test breaks, fix it immediately or understand why
- ✅ Add new tests for new features; never skip testing
- ✅ Maintain backward compatibility unless explicitly discussed
- ✅ Document breaking changes prominently

**DON'T**:
- ❌ Modify existing tests to make them pass (that's cheating)
- ❌ Disable or skip tests temporarily (they rarely get re-enabled)
- ❌ Assume "tests are wrong; I'll fix the code instead"
- ❌ Make breaking changes without discussion
- ❌ Delete tests because they're "inconvenient"

**Rule**: If your code breaks a test, your code is wrong. Period.

---

### U6: Treat Warnings as Errors

**DO**:
- ✅ Fix all compiler/linter warnings immediately
- ✅ Enable strict mode: TypeScript `strict: true`, ESLint rules enabled
- ✅ Treat unused variable warnings as failures
- ✅ Address deprecation warnings; never ignore them
- ✅ Configure build to fail on warnings

**DON'T**:
- ❌ Leave TypeScript any-types; always specify types
- ❌ Ignore linter warnings
- ❌ Use `// @ts-ignore` to bypass type checking (except with comment explaining why)
- ❌ Suppress warnings; fix the root cause
- ❌ Deploy code with warnings

---

### U7: Version Everything; Never Assume Immutability

**DO**:
- ✅ Version APIs: v1, v2, v3 (breaking changes get new version)
- ✅ Version database schemas: track migrations
- ✅ Version configuration: know what config ran with what code
- ✅ Tag releases in version control
- ✅ Document what changed and why in each version

**DON'T**:
- ❌ Change API contracts without versioning
- ❌ Assume database schema is stable; it changes
- ❌ Deploy without knowing what you're deploying
- ❌ Modify old API versions; create new versions instead
- ❌ Assume "this won't break anything"

---

### U8: Infrastructure as Code; Environment Parity

**DO**:
- ✅ Define all infrastructure in code (Docker, Terraform, K8s manifests, etc.)
- ✅ Run same code locally as in production
- ✅ Use environment variables for configuration differences
- ✅ Document environment setup in RUNBOOK.md
- ✅ Test locally before deploying

**DON'T**:
- ❌ Manual server setup; always use code
- ❌ Different environments running different code
- ❌ Hardcode environment-specific settings in code
- ❌ Deploy untested code
- ❌ Assume "it works locally, it'll work in production"

---

## Domain 1: Code Quality & Maintainability (Do's & Don'ts)

### D1.1: Naming Standards

**DO**:
- ✅ Use names that answer: "What does this represent?" without reading surrounding code
- ✅ Use pronounceable names: can say them out loud, can search for them
- ✅ Make names long enough to be clear; sacrifice characters for clarity
- ✅ Use domain language; if business calls it "Order", not "Item" or "Object"
- ✅ Use consistent naming patterns across codebase: all getters start with get, all validators with validate

**DON'T**:
- ❌ Single letters except for loop indices (i, j, k)
- ❌ Abbreviations (usr, cfg, arr, temp, data, obj, x)
- ❌ Generic names (value, result, item, thing, stuff)
- ❌ Hungarian notation (strName, intAge, boolActive)
- ❌ Names that require a comment to understand

**Naming Audit Rule**: For every variable/function, ask "can I understand its purpose in 3 seconds without reading its usage?" If no, rename it.

---

### D1.2: Function Design

**DO**:
- ✅ Keep functions small: target 5-15 lines, max 20 lines
- ✅ Functions should fit on one screen without scrolling
- ✅ One level of abstraction per function; don't mix high-level and low-level logic
- ✅ One responsibility per function; one reason to change
- ✅ Pure functions preferred: same input → same output (no side effects)
- ✅ Name functions as verbs describing the action

**DON'T**:
- ❌ 50+ line functions; split them up
- ❌ Mix abstraction levels in one function
- ❌ Functions with multiple purposes
- ❌ Functions with undocumented side effects
- ❌ Vague function names (process, handle, manage, do)

**Refactoring Rule**: When writing a function longer than 20 lines, stop and ask: "What sub-problems can I extract?"

---

### D1.3: Variable Scope & Lifetime

**DO**:
- ✅ Keep variable scope as narrow as possible
- ✅ Initialize variables close to where they're used
- ✅ Use const by default; use let only when reassignment needed
- ✅ Avoid global variables; use dependency injection
- ✅ Clear variable lifetime: when is it created? when destroyed?

**DON'T**:
- ❌ Global variables or shared state
- ❌ Wide variable scope (variables used far from declaration)
- ❌ Reusing variables for different purposes
- ❌ Using var (use const/let in modern code)
- ❌ Mutable class fields without clear ownership

---

### D1.4: Complexity Management

**DO**:
- ✅ Limit cyclomatic complexity: target 5-10 per function
- ✅ Break complex logic into smaller functions
- ✅ Use early returns to avoid deep nesting
- ✅ Extract conditionals into named functions: `if (isUserEligible())` instead of nested conditions
- ✅ Use switch statements instead of long if-else chains

**DON'T**:
- ❌ Deeply nested conditionals (3+ levels)
- ❌ Long if-else chains for state/type handling
- ❌ Complex boolean expressions; assign to named variables
- ❌ Ternary operators nested more than once
- ❌ Multiple responsibilities hiding in complex functions

**Complexity Rule**: If you need more than 3 nested levels of logic, you have a design problem.

---

### D1.5: Comments & Documentation

**DO**:
- ✅ Comments explain *why*, not *what*
- ✅ Reference tickets/requirements when explaining decisions
- ✅ Document assumptions: "This assumes X is already validated"
- ✅ Mark TODOs with owner: `// TODO(alice): implement caching [TICKET-123]`
- ✅ Document gotchas and non-obvious behavior

**DON'T**:
- ❌ Comments that restate the code
- ❌ Commented-out code; delete it or version control it
- ❌ Comments that drift from code (update them when code changes)
- ❌ TODOs without owner or context
- ❌ Comments explaining what the variable name should have explained

**Comment Audit**: For every comment, ask "could I improve the code so this comment is unnecessary?" If yes, do it.

---

## Domain 2: System Architecture (Do's & Don'ts)

### D2.1: Coupling & Dependencies

**DO**:
- ✅ Depend on abstractions (interfaces, contracts), not concrete implementations
- ✅ Use dependency injection: pass dependencies in, don't create them internally
- ✅ Make dependencies explicit: visible in function signatures and constructors
- ✅ Minimize imports from other modules
- ✅ Establish clear boundaries: which modules can import which
- ✅ Document module responsibilities: what does this module own?

**DON'T**:
- ❌ Hardcode concrete dependencies (new Database(), new EmailService())
- ❌ Create dependencies inside functions (creates hidden dependencies)
- ❌ Import from modules multiple layers away (import from immediate dependencies only)
- ❌ Circular dependencies (A imports B, B imports A)
- ❌ Global singletons; inject dependencies instead

**Coupling Audit Rule**: For every import statement, ask "could I swap this for a different implementation?" If no, you have tight coupling.

---

### D2.2: SOLID Principles Enforcement

**DO**:
- ✅ Single Responsibility: one reason to change per class/module
- ✅ Open/Closed: open for extension, closed for modification (use interfaces)
- ✅ Liskov Substitution: derived classes are truly substitutable
- ✅ Interface Segregation: clients only depend on methods they use
- ✅ Dependency Inversion: depend on abstractions, not concrete types

**DON'T**:
- ❌ Classes with multiple reasons to change
- ❌ Modifying existing code to add features; extend via interfaces instead
- ❌ Derived classes breaking parent contracts
- ❌ Fat interfaces forcing implementations of unused methods
- ❌ Direct dependencies on concrete classes

**SOLID Audit**: For each class, can you name one reason it would change? If >1, split it.

---

### D2.3: Module Organization

**DO**:
- ✅ Organize by feature/domain, not by type (not src/controllers, src/services, src/models)
- ✅ Group related code: UserService, UserRepository, UserValidator together
- ✅ Clear public interfaces: export only what other modules need
- ✅ Internal vs external: mark private functions/fields clearly
- ✅ Document module purpose: README or comments at top of module

**DON'T**:
- ❌ Organize by layer (spreads single feature across many folders)
- ❌ Mixed concerns in one folder
- ❌ Exporting everything; be selective about public APIs
- ❌ Unclear what module is for
- ❌ Deep folder nesting (>4 levels); signals poor organization

---

### D2.4: API Design & Versioning

**DO**:
- ✅ Version APIs from day 1: /v1/users, /v2/users
- ✅ Document API contracts: what inputs required, what outputs returned, what errors possible
- ✅ Use semantic versioning: breaking changes = major version
- ✅ Support old API versions for transition period (e.g., 2 releases)
- ✅ Deprecate clearly: announce removal date, provide migration path

**DON'T**:
- ❌ Change API behavior without versioning
- ❌ Remove endpoints without warning
- ❌ Return different data structures based on undocumented conditions
- ❌ Accept any parameter shape; validate strictly
- ❌ Assume backwards compatibility; it requires effort

---

### D2.5: Layering & Boundaries

**DO**:
- ✅ Define clear layers: Presentation → Application → Domain → Infrastructure
- ✅ Dependencies point downward (Presentation depends on Application, not vice versa)
- ✅ One system owns a dataset; others access via API
- ✅ Clear data ownership boundaries
- ✅ Cross-cutting concerns in middleware/utilities (logging, auth, error handling)

**DON'T**:
- ❌ Circular dependencies between layers
- ❌ Infrastructure code in domain layer
- ❌ Multiple systems accessing same database directly
- ❌ Skipping layers (UI accessing database directly)
- ❌ Unclear layer boundaries

---

## Domain 3: Test-Driven Development (Do's & Don'ts)

### D3.1: TDD Discipline

**DO**:
- ✅ Write test first (RED)
- ✅ Write minimal code to pass (GREEN)
- ✅ Refactor with confidence (REFACTOR)
- ✅ Tests fail before implementation; verify test is actually testing
- ✅ One concept per test; one assertion if possible

**DON'T**:
- ❌ Write code first, tests after ("testing" is now verification, not development)
- ❌ Write tests that don't fail when code is missing
- ❌ Multiple assertions in one test (hard to diagnose failures)
- ❌ Tests that test the test framework, not your code
- ❌ Tests that are brittle (break for minor code changes)

**TDD Rule**: If you write code without a failing test first, you're not doing TDD.

---

### D3.2: Test Isolation & Mocking

**DO**:
- ✅ Mock all external dependencies (databases, APIs, filesystems)
- ✅ Test only the unit under test; everything else is mocked
- ✅ Fast tests: milliseconds, not seconds
- ✅ No shared state between tests; each test starts fresh
- ✅ Deterministic tests: same input always gives same output

**DON'T**:
- ❌ Tests that depend on real databases (slow, brittle)
- ❌ Tests that call real APIs (slow, flaky)
- ❌ Tests that read/write real files (slow, platform-dependent)
- ❌ Shared state between tests (test order matters; fragile)
- ❌ Non-deterministic tests (random data, time-dependent)
- ❌ Tests that test 5 things at once

**Test Isolation Rule**: A test should fail only when the code it's testing is wrong, never for external reasons.

---

### D3.3: Test Coverage Goals

**DO**:
- ✅ Aim for 80-90% code coverage by tests
- ✅ Cover happy paths (the normal flow)
- ✅ Cover error paths (what happens when things break)
- ✅ Cover edge cases (boundaries, empty inputs, null, etc.)
- ✅ Use coverage tools; measure regularly

**DON'T**:
- ❌ Write tests just to hit coverage target (cargo cult testing)
- ❌ Accept <60% coverage
- ❌ Aim for 100% coverage; diminishing returns and brittle tests
- ❌ Skip testing "simple" code (bugs hide in simple code)
- ❌ Test implementation details instead of behavior

**Coverage Rule**: Measure coverage; use it as a guide, not a goal. Focus on meaningful tests.

---

### D3.4: Test Names & Organization

**DO**:
- ✅ Test names describe the behavior being tested: `should_return_user_when_id_is_valid()`
- ✅ Organize tests by the thing being tested
- ✅ One describe block per function/class
- ✅ Clear test structure: Arrange → Act → Assert
- ✅ Use consistent naming: all tests start with should/it

**DON'T**:
- ❌ Vague test names: `test_user()`, `test_validation()`
- ❌ Test names that don't reveal what's being tested
- ❌ Many unrelated tests in one file
- ❌ Unclear test flow (mixing setup with assertions)
- ❌ Comments in tests saying "this is what the test does"

**Test Naming Rule**: Reader should understand what's tested just from the test name.

---

### D3.5: Regression Testing

**DO**:
- ✅ Add regression tests when bugs are found (test that catches the bug)
- ✅ Keep regression tests forever; they prevent re-occurrence
- ✅ Build regression test suite covering common failure modes
- ✅ Run regression tests in CI/CD before every deploy
- ✅ Document why each regression test exists (what bug it catches)

**DON'T**:
- ❌ Fix bugs without adding test
- ❌ Delete regression tests because "that shouldn't happen anymore"
- ❌ Skip regression testing to ship faster
- ❌ Assume "the developer will fix it correctly this time"
- ❌ Forget why a regression test exists

**Regression Rule**: Every bug fixed → one test added. Test should fail with old code, pass with new code.

---

## Domain 4: Performance & Optimization (Do's & Don'ts)

### D4.1: Measurement & Profiling

**DO**:
- ✅ Profile the system with realistic load before optimizing
- ✅ Identify the actual bottleneck (using profiler), don't guess
- ✅ Measure before and after optimization
- ✅ Document why each optimization exists and what it improved
- ✅ Use realistic data; synthetic benchmarks mislead

**DON'T**:
- ❌ Optimize without measurement (premature optimization)
- ❌ Assume you know the bottleneck (you usually don't)
- ❌ Optimize "just in case"
- ❌ Claim improvement without showing benchmarks
- ❌ Use synthetic data; test with real workloads

**Optimization Rule**: No optimization without data. Measure, identify, optimize, verify.

---

### D4.2: Performance Patterns

**DO**:
- ✅ Minimize memory allocations in hot loops
- ✅ Cache expensive operations; invalidate when needed
- ✅ Batch operations; avoid per-item overhead
- ✅ Use lazy loading for expensive data
- ✅ Profile memory usage; look for leaks

**DON'T**:
- ❌ Create objects in loops when you could reuse them
- ❌ Recalculate expensive values every call
- ❌ Process items one-by-one when batching is possible
- ❌ Load all data upfront; defer until needed
- ❌ Ignore memory leaks "they'll be GC'd"

**Performance Rule**: Fast is great; correct is essential. Never sacrifice correctness for speed.

---

### D4.3: Optimization Trade-offs

**DO**:
- ✅ Document trade-offs: what clarity did we sacrifice for speed?
- ✅ Consider maintenance cost: is this harder to understand?
- ✅ Optimize for common cases; let rare cases be slower
- ✅ Measure impact of trade-off: was it worth it?
- ✅ Be willing to revert optimizations if they cause problems

**DON'T**:
- ❌ Make code obscure for marginal speed improvements
- ❌ Optimize rare cases at expense of common cases
- ❌ Refuse to maintain optimized code ("I don't understand it either")
- ❌ Optimize without understanding the cost
- ❌ Assume optimization is always worth it

**Trade-off Rule**: Clarity > Speed, unless Speed is a requirement and you've measured the problem.

---

## Domain 5: Design Patterns & Reusability (Do's & Don'ts)

### D5.1: When to Use Patterns

**DO**:
- ✅ Use patterns when solving recurring problems (you've seen pattern >2 times)
- ✅ Use patterns when they simplify code compared to ad-hoc approach
- ✅ Use patterns your team understands; shared vocabulary matters
- ✅ Document which pattern you're using and why
- ✅ Use patterns as communication tool across teams

**DON'T**:
- ❌ Use patterns preemptively ("I might need Factory someday")
- ❌ Force patterns where simple code is clearer
- ❌ Use obscure patterns your team doesn't know
- ❌ Apply pattern dogmatically; bend it if needed
- ❌ Over-engineer for hypothetical future needs

**Pattern Rule**: Pattern should simplify code, not complicate it. If simpler without it, don't use it.

---

### D5.2: Composition Over Inheritance

**DO**:
- ✅ Use composition to combine behaviors
- ✅ Use inheritance only for "is-a" relationships
- ✅ Prefer interfaces and composition to deep inheritance hierarchies
- ✅ Program to interfaces, not implementations
- ✅ Keep inheritance hierarchies shallow (<3 levels)

**DON'T**:
- ❌ Create deep inheritance hierarchies (>3 levels)
- ❌ Use inheritance for code reuse (use composition instead)
- ❌ Inherit from concrete classes (inherit from interfaces)
- ❌ Create abstract base classes with no implementations
- ❌ Multiple inheritance (if your language supports it)

**Inheritance Rule**: If you can't explain the inheritance with "is-a", use composition instead.

---

### D5.3: Reusability Standards

**DO**:
- ✅ Extract reusable logic into functions/classes early
- ✅ Test reusable code thoroughly (used in many places)
- ✅ Document inputs, outputs, assumptions clearly
- ✅ Make reusable code configurable; avoid hard-coded assumptions
- ✅ Version reusable code; breaking changes are painful

**DON'T**:
- ❌ Duplicate code "because reusing would require parameters"
- ❌ Reuse code that isn't tested (spreads bugs)
- ❌ Force reusability where one-off code is fine
- ❌ Reuse code with side effects; pure functions are safer
- ❌ Change reusable code without considering all consumers

**Reusability Rule**: DRY is good, but don't reuse untested code or premature abstractions.

---

## Code Evolution & Lifecycle Rules

### E1: Evolving Code (Not Rewriting)

**DO**:
- ✅ Evolve code incrementally; add features, refactor, improve
- ✅ Small, reviewable commits; show your thinking
- ✅ Keep code working between changes (no long-running branches)
- ✅ Use feature flags to deploy unfinished features safely
- ✅ Refactor continuously; don't defer cleanup

**DON'T**:
- ❌ Rewrite entire modules "to make them better"
- ❌ Large commits with many unrelated changes
- ❌ Breaking changes without deprecation period
- ❌ Leaving code broken "I'll fix it in the next commit"
- ❌ Deferring refactoring "I'll do it later"

**Evolution Rule**: Code should improve with each commit. Refactor as you touch code.

---

### E2: Deprecation & Cleanup

**DO**:
- ✅ Mark deprecated APIs clearly: `@deprecated Use newAPI() instead. Remove in v3.0.`
- ✅ Provide migration path for users of deprecated code
- ✅ Enforce deprecation: tools should warn users
- ✅ Remove deprecated code after transition period (2 major versions)
- ✅ Document removal in release notes

**DON'T**:
- ❌ Remove old APIs without warning
- ❌ Deprecate without replacement
- ❌ Keep deprecated code forever (cruft builds up)
- ❌ Fail to tell users about deprecation
- ❌ Change deprecated code while keeping it "for compatibility"

**Deprecation Rule**: No surprise removals. Deprecate → Communicate → Wait → Remove.

---

### E3: Never Break Good Code for a New Feature

**DO**:
- ✅ Extend existing code, don't rewrite it
- ✅ Add new features in new modules/functions
- ✅ Refactor only what's necessary for the new feature
- ✅ Test that old features still work after adding new feature
- ✅ Use feature flags if behavior changes significantly

**DON'T**:
- ❌ Modify working code to add features (breaks existing behavior)
- ❌ Assume "refactoring while adding feature is fine" (introduces bugs)
- ❌ Delete old implementation "since we're rewriting"
- ❌ Change API contracts to fit new feature
- ❌ Break existing tests to add new feature

**Good Code Rule**: If it works, extend it. Don't break it to add features.

**Verification Before Closing**:
- ✅ Have you run ALL existing tests? Do they pass?
- ✅ Have you tested the new feature? Does it work?
- ✅ Have you tested old features? Still work?
- ✅ Have you checked code review? No red flags?

---

### E4: Implementation Completion Criteria

**DO**:
- ✅ Code is written and reviewed
- ✅ All tests pass (old and new)
- ✅ Performance is acceptable (measured if critical path)
- ✅ Security is verified (input validation, no secrets in logs)
- ✅ Documentation is updated (LOGS.md, ARCHITECTURE.md, etc.)
- ✅ Logging is comprehensive (debug traces, error tracking)
- ✅ Regression tests are added
- ✅ Code is clean (no linter warnings, warnings treated as errors)
- ✅ Vibecoder confirms completion

**DON'T**:
- ❌ Mark complete without testing
- ❌ Skip documentation
- ❌ Skip logging
- ❌ Deploy without regression test
- ❌ Mark complete without explicit confirmation from team

**Completion Checklist (Before Marking Done)**:
```
□ Tests pass: all existing + new tests
□ Code reviewed: no major issues
□ Security verified: no vulnerabilities
□ Logging added: sufficient for debugging
□ Documentation updated: LOGS.md, ARCHITECTURE.md, CODE_INVENTORY.md, RUNBOOK.md
□ Regression tests added: covers new behavior
□ Clean code: no linter warnings, complexity within bounds
□ Performance verified: meets requirements or measured baseline
□ Vibecoder confirmed: implementation is production-ready
```

---

## Documentation Rules

### D1: Living Documentation

**DO**:
- ✅ Keep documentation updated with code; document as you code
- ✅ Documentation lives in code repository, version controlled
- ✅ Link documentation to relevant code (IDE should show docs)
- ✅ Remove outdated documentation; stale docs are worse than no docs
- ✅ Make documentation easy to find and search

**DON'T**:
- ❌ Documentation in separate wiki/tool (drifts from code)
- ❌ Documentation written after feature is done
- ❌ Outdated documentation left in place
- ❌ Beautiful documentation that nobody can find
- ❌ Documentation that requires multiple tools to read

---

### D2: Required Documentation Files

Every project must maintain these four files, timestamped and updated for each change:

#### D2.1: LOGS.md - Change History

**Purpose**: Timeline of changes, decisions, and pivots

**Format**:
```markdown
# Change Logs

## [2026-01-16 18:45 UTC] - Feature: User Authentication
- **Author**: Alice
- **Type**: Feature
- **Impact**: High (affects all users)
- **Changes**:
  - Added JWT-based authentication
  - Created UserAuthService class
  - Updated API routes to require auth token
  - Migration: added auth_tokens table
- **Tests**: Added 15 unit tests, 3 integration tests
- **Performance**: No regression (measured baseline)
- **Migration Path**: Backward compatible; old sessions still work for 30 days
- **Related Tickets**: AUTH-123, AUTH-124

## [2026-01-15 09:20 UTC] - Bugfix: Payment Processing Race Condition
- **Author**: Bob
- **Type**: Bugfix
- **Impact**: Medium (affects concurrent orders)
- **Root Cause**: Multiple threads calling charge() without locking
- **Fix**: Added mutex lock around payment processing
- **Tests**: Added regression test that reproduces bug
- **Verified**: Ran 1000 concurrent orders; no race conditions
```

**Update Rule**: Every code commit that affects behavior should have a LOGS.md entry.

---

#### D2.2: ARCHITECTURE.md - System Design & Decisions

**Purpose**: Architectural decisions, trade-offs, and pivots

**Format**:
```markdown
# System Architecture

## Core Principles
- Microservices: each domain has independent service
- Data ownership: UserService owns users table; others access via API
- Async messaging: services communicate via event queue

## Decision: Microservices vs Monolith (2026-01-10)
- **Decision**: Microservices
- **Rationale**: Independent scaling, team autonomy, deploy without coordination
- **Trade-off**: Added operational complexity; needed service mesh, monitoring
- **Status**: Active (no pivot planned)
- **Related Decisions**: Message Queue Selection, Service Registry

## Decision: Postgres vs MongoDB (2026-01-08)
- **Decision**: Postgres (changed from MongoDB)
- **Rationale**: Strong consistency needed for financial data; ACID transactions required
- **Trade-off**: Less flexible schema; harder to scale horizontally
- **Migration Path**: Migrated 50M documents in 12 hours without downtime
- **Status**: Active

## Layers & Dependencies
```
┌─────────────────────────────────────┐
│ API Layer (Express, FastAPI)        │ Presentation
├─────────────────────────────────────┤
│ Service Layer (business logic)      │ Application
├─────────────────────────────────────┤
│ Domain Layer (entities, value obj)  │ Domain
├─────────────────────────────────────┤
│ Repository Layer (data access)      │ Infrastructure
└─────────────────────────────────────┘
```

## Data Ownership
- **UserService**: owns users, sessions, preferences
- **OrderService**: owns orders, order items, order history
- **PaymentService**: owns transactions, payment methods
- Other services access via API, never direct database access

## Communication Patterns
- Synchronous: REST APIs for immediate responses (user creates order)
- Asynchronous: Events for notifications (order created → send email)
- Never: direct database access across services

## Scaling Strategy
- **Compute**: Horizontal scaling via load balancer
- **Data**: Database replication (read replicas for read-heavy queries)
- **Cache**: Redis for session cache, query result cache
- **Async**: Message queue for background jobs
```

**Update Rule**: When making architectural decisions (new service, new database, new pattern), document in ARCHITECTURE.md.

---

#### D2.3: CODE_INVENTORY.md - File Map & Dependencies

**Purpose**: Quick reference of what exists and where; reduces hallucinations about what's already built

**Format**:
```markdown
# Code Inventory

## Core Modules

### Auth Module (/src/auth)
- **Purpose**: User authentication, JWT tokens, session management
- **Key Files**:
  - `UserAuthService.ts`: authenticate, generateToken, validateToken
  - `JWTProvider.ts`: JWT signing/verification
  - `AuthMiddleware.ts`: Express middleware for auth checks
  - `SessionRepository.ts`: session storage and retrieval
- **Dependencies**: Redis (session cache), PostgreSQL (users table)
- **Exports**: 
  - `authenticateUser(username, password): JWT`
  - `validateToken(token): PayloadOrNull`
  - `authMiddleware: ExpressMiddleware`
- **Usage**: All API endpoints that require auth use authMiddleware
- **Tests**: `/tests/auth` (25 tests, 92% coverage)
- **Tables**: users, sessions, auth_tokens

### Order Module (/src/orders)
- **Purpose**: Order creation, tracking, fulfillment
- **Key Files**:
  - `OrderService.ts`: createOrder, getOrder, updateStatus
  - `OrderRepository.ts`: database queries
  - `OrderValidator.ts`: validate order data
  - `OrderEventPublisher.ts`: publish order events
- **Dependencies**: PaymentService (API), UserService (API), RabbitMQ (events)
- **Exports**:
  - `createOrder(orderData): OrderID`
  - `getOrder(orderId): OrderDetail`
  - `updateOrderStatus(orderId, status): void`
- **Events Published**: order:created, order:shipped, order:delivered
- **Subscribers**: EmailService (notifies), AnalyticsService (tracks)
- **Tables**: orders, order_items, order_events, order_status_history

### Payment Module (/src/payments)
- **Purpose**: Payment processing, refunds, transaction tracking
- **Key Files**:
  - `PaymentService.ts`: charge, refund, retry logic
  - `PaymentGateway.ts`: adapter for Stripe API
  - `PaymentRepository.ts`: transaction storage
- **Dependencies**: Stripe API, PostgreSQL (transactions table)
- **Exports**:
  - `chargeCard(cardToken, amount): TransactionID`
  - `refundTransaction(transactionId, amount): void`
- **Errors**: PaymentFailedException, PaymentTimeoutException
- **Retry Logic**: 3 retries with exponential backoff
- **Tables**: transactions, payment_methods, payment_events
```

**Update Rule**: When adding/removing modules or changing exports, update CODE_INVENTORY.md.

---

#### D2.4: RUNBOOK.md - How to Run & Deploy

**Purpose**: Instructions for running locally, deploying, troubleshooting

**Format**:
```markdown
# Runbook: How to Run & Deploy

## Local Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL client CLI

### Setup
```bash
git clone [repo]
cd [project]
npm install
cp .env.example .env
docker-compose up -d  # Starts Postgres, Redis
npm run db:migrate    # Runs database migrations
npm run seed:dev      # Seeds test data
npm run dev           # Starts server on :3000
```

### Environment Variables
```bash
# .env file (not committed to version control)
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/app_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-not-for-production
STRIPE_SECRET_KEY=sk_test_xxxx
```

### Running Tests
```bash
npm run test           # All tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
npm run test:e2e      # End-to-end tests (slower)
```

## Staging Deployment

### Pre-deployment Checks
```bash
npm run lint           # Check code style
npm run test           # Run full test suite
npm run build          # Build TypeScript
docker build -t app:staging .  # Build Docker image
```

### Deploy to Staging
```bash
kubectl apply -f k8s/staging/
kubectl set image deployment/app app=app:staging --namespace=staging
kubectl rollout status deployment/app --namespace=staging
```

### Verify
```bash
curl https://staging.example.com/health  # Should return 200 OK
npm run test:e2e -- --baseUrl=https://staging.example.com
```

## Production Deployment

### Pre-deployment Checklist
- [ ] All tests pass
- [ ] Code review approved
- [ ] LOGS.md updated
- [ ] ARCHITECTURE.md updated (if architectural changes)
- [ ] Migration written & tested
- [ ] Rollback plan documented
- [ ] Monitoring/alerts configured

### Deploy to Production
```bash
docker build -t app:v1.2.3 .
docker push registry.example.com/app:v1.2.3
kubectl apply -f k8s/production/
kubectl set image deployment/app app=app:v1.2.3 --namespace=production
kubectl rollout status deployment/app --namespace=production
```

### Post-deployment
```bash
# Monitor error rates
kubectl logs -f deployment/app --namespace=production

# Check metrics
curl https://metrics.example.com/api/error_rate  # Should be <0.1%

# Verify functionality
curl https://api.example.com/health
npm run test:smoke -- --baseUrl=https://api.example.com
```

### Rollback (if needed)
```bash
kubectl rollout undo deployment/app --namespace=production
# Or revert to previous image version
kubectl set image deployment/app app=app:v1.2.2 --namespace=production
```

## Troubleshooting

### Database Connection Error
```
Error: ECONNREFUSED - Connection refused
```
Fix: `docker-compose up -d postgres` and retry

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
Fix: `lsof -i :3000 | kill -9 PID` or change port in .env

### Tests Failing After Pull
```
Tests fail but worked yesterday
```
Fix: `npm install` (dependencies may have changed) + `npm run db:migrate`

## Health Checks

### API is healthy
```bash
curl http://localhost:3000/health
# Should return: { "status": "ok", "timestamp": "2026-01-16T18:45:00Z" }
```

### Database is connected
```bash
curl http://localhost:3000/health/db
# Should return: { "status": "connected", "latency": "2ms" }
```

### Redis is connected
```bash
curl http://localhost:3000/health/redis
# Should return: { "status": "connected", "latency": "1ms" }
```
```

**Update Rule**: When setup changes, deployment process changes, or new troubleshooting found, update RUNBOOK.md.

---

### D3: Inline Documentation

**DO**:
- ✅ Complex algorithms: explain the approach and complexity
- ✅ Non-obvious decisions: link to ticket/design doc
- ✅ Assumptions: document what you're assuming to be true
- ✅ Business rules: reference policy or requirements
- ✅ Gotchas: warn about non-obvious behavior

**DON'T**:
- ❌ Document what the code obviously does
- ❌ Leave TODO comments without owner or context
- ❌ Assume next reader knows the business context
- ❌ Leave stale comments; update or delete them
- ❌ Use comments instead of refactoring

---

## Logging & Debugging Rules

### L1: Comprehensive Logging Strategy

**DO**:
- ✅ Log at multiple levels: DEBUG (detailed), INFO (milestones), WARN (problems), ERROR (failures)
- ✅ Include context: user ID, request ID, timestamps, durations
- ✅ Log entry points: when functions start (DEBUG level)
- ✅ Log decision points: when code branches (DEBUG level)
- ✅ Log errors with full stack trace and context
- ✅ Structure logs as JSON for easy parsing and searching
- ✅ Include request tracing: same request ID through all service calls

**DON'T**:
- ❌ Log too little: can't debug issues
- ❌ Log too much: noise hides real problems
- ❌ Use string concatenation for logs; use structured logging
- ❌ Log sensitive data: no passwords, tokens, credit cards
- ❌ Forget to log errors
- ❌ Add logs only after bug found

**Logging Rule**: Add logs before implementation is considered complete. Can't debug without logs.

---

### L2: Structured Logging

**DO**:
```javascript
// ✅ Structured logging: parseable, searchable
logger.info('user_created', {
  userId: user.id,
  email: user.email,
  source: 'api',
  timestamp: new Date().toISOString(),
  requestId: req.id
});

logger.error('payment_failed', {
  orderId: order.id,
  userId: order.userId,
  error: err.message,
  errorCode: err.code,
  retries: 3,
  nextRetry: new Date(Date.now() + 5000).toISOString(),
  stack: err.stack,
  requestId: req.id
});
```

**DON'T**:
```javascript
// ❌ Unstructured logging: hard to parse, hard to search
logger.info('User ' + user.id + ' created');
console.log('Error: ' + err.message);  // String formatting, not structured
```

---

### L3: Debug-Level Logging (Before Closing)

**DO**:
- ✅ Add DEBUG logs at function entry: `logger.debug('entering_function', { args: ... })`
- ✅ Add DEBUG logs at decision points: `logger.debug('condition_check', { value, result })`
- ✅ Add DEBUG logs before expensive operations: `logger.debug('querying_database', { query, params })`
- ✅ Add DEBUG logs for loops (sample if very large): `logger.debug('processing_item', { item: ..., index, total })`
- ✅ Make DEBUG logs descriptive: include variable names and values

**Rule**: When debugging production issues, DEBUG logs should tell the story of what happened.

**Example**:
```javascript
async function processOrder(orderId) {
  logger.debug('entering_processOrder', { orderId });
  
  const order = await orderRepository.find(orderId);
  logger.debug('order_retrieved', { 
    orderId, 
    status: order.status, 
    items: order.items.length 
  });
  
  if (order.status === 'PENDING') {
    logger.debug('order_is_pending', { orderId });
    
    const payment = await paymentService.charge(order);
    logger.debug('payment_processed', { 
      orderId, 
      transactionId: payment.id, 
      amount: payment.amount 
    });
  } else {
    logger.debug('order_not_pending', { 
      orderId, 
      currentStatus: order.status 
    });
  }
}
```

---

### L4: Error Logging

**DO**:
- ✅ Log every error with full context
- ✅ Include stack trace for debugging
- ✅ Include user/request context (who did what)
- ✅ Include the action that was being attempted
- ✅ Include any recovery action taken

**DON'T**:
- ❌ Catch error and do nothing
- ❌ Log error message only, without stack trace
- ❌ Log sensitive data in errors
- ❌ Swallow errors silently
- ❌ Log same error twice

**Example**:
```javascript
async function chargeCard(cardToken, amount) {
  try {
    const result = await stripeAPI.charge(cardToken, amount);
    logger.info('payment_successful', { 
      amount, 
      transactionId: result.id 
    });
    return result;
  } catch (err) {
    // ✅ Full context for debugging
    logger.error('payment_failed', {
      error: err.message,
      errorCode: err.code,
      stack: err.stack,
      cardToken: cardToken.substring(0, 4) + '****',  // Partial, safe
      amount,
      attempt: 1,
      nextAction: 'retry'
    });
    
    // Handle error (retry, refund, notify user, etc.)
    throw new PaymentFailedException(`Could not charge card: ${err.message}`);
  }
}
```

---

### L5: Request Tracing

**DO**:
- ✅ Generate unique request ID per API request
- ✅ Pass request ID through all service calls
- ✅ Include request ID in all logs
- ✅ Return request ID to client (for support debugging)
- ✅ Make traces searchable: "show me all logs with request ID XYZ"

**Example**:
```javascript
// In API middleware: generate request ID
app.use((req, res, next) => {
  req.id = generateUUID();
  logger.info('request_start', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  
  res.on('finish', () => {
    logger.info('request_end', {
      requestId: req.id,
      statusCode: res.statusCode,
      duration: Date.now() - req.startTime
    });
  });
  
  next();
});

// Pass request ID to services
async function createOrder(orderId, req) {
  logger.info('creating_order', {
    orderId,
    requestId: req.id
  });
  
  const payment = await paymentService.charge(order, {
    requestId: req.id
  });
}

// Send request ID to client
res.set('X-Request-ID', req.id);
res.json({ data: result, requestId: req.id });
```

---

## Regression Testing Rules

### R1: Add Test When Bug is Found

**DO**:
- ✅ When bug is reported, write test that reproduces it first
- ✅ Verify test fails with current code (proves it catches the bug)
- ✅ Fix the bug
- ✅ Verify test passes with fix
- ✅ Keep test forever; prevents re-occurrence
- ✅ Document why the test exists (what bug it prevents)

**DON'T**:
- ❌ Fix bug without test
- ❌ Delete regression test when "we fixed it correctly now"
- ❌ Skip regression testing to move faster
- ❌ Assume QA caught all regressions

**Regression Test Format**:
```javascript
describe('Regression: Race Condition in Payment Processing', () => {
  it('should prevent double-charging when concurrent requests arrive', async () => {
    // Bug: Multiple requests for same order charged twice
    // Fixed in: v2.3.1
    // Impact: Overcharged customers
    
    const order = await createTestOrder({ amount: 100 });
    
    // Send two concurrent charge requests
    const [charge1, charge2] = await Promise.allSettled([
      paymentService.charge(order),
      paymentService.charge(order)
    ]);
    
    // Only one should succeed
    expect(charge1.status === 'fulfilled' ? 1 : 0 + charge2.status === 'fulfilled' ? 1 : 0).toBe(1);
    
    // Verify only one transaction recorded
    const transactions = await paymentRepository.find({ orderId: order.id });
    expect(transactions).toHaveLength(1);
  });
});
```

---

### R2: Regression Test Suite

**DO**:
- ✅ Maintain comprehensive regression test suite
- ✅ Run regression tests before every deploy
- ✅ Add test for every bug found
- ✅ Organize regression tests by domain (AuthRegressions, PaymentRegressions, etc.)
- ✅ Document what each regression test prevents

**DON'T**:
- ❌ Skip regression tests to deploy faster
- ❌ Delete regression tests
- ❌ Merge code that breaks regression tests
- ❌ Assume QA will find regressions

---

## Context & Hallucination Prevention

### C1: Before You Start Writing Code

**DO**:
- ✅ Read CODE_INVENTORY.md: What exists? What API can I use?
- ✅ Read ARCHITECTURE.md: What patterns should I follow? What dependencies exist?
- ✅ Read LOGS.md: Recent changes? Any related work?
- ✅ Search codebase: Is this already implemented elsewhere?
- ✅ Check tests: How should this be tested?

**DON'T**:
- ❌ Assume what exists; check CODE_INVENTORY.md
- ❌ Implement from scratch if similar code exists
- ❌ Violate documented architecture patterns
- ❌ Miss recent changes in LOGS.md
- ❌ Duplicate functionality

**Pre-Implementation Checklist**:
```
□ Read CODE_INVENTORY.md for related modules
□ Read ARCHITECTURE.md for relevant patterns
□ Read LOGS.md for recent related changes
□ Search codebase for similar implementations
□ Checked existing tests for pattern examples
□ Identified dependencies and their APIs
□ Understand where this code will live
```

---

### C2: Hallucination Prevention

**DO**:
- ✅ Assume nothing; verify in code
- ✅ Check method signatures in tests
- ✅ Link to actual files and line numbers
- ✅ Say "I don't know" if you're unsure
- ✅ Reference existing code patterns
- ✅ Ask: does this file/function exist in CODE_INVENTORY.md?

**DON'T**:
- ❌ Assume API signatures without checking
- ❌ Assume files exist without verifying
- ❌ Invent function names that sound right
- ❌ Assume you know how to use a module without reading tests
- ❌ Pretend confidence when unsure

**Hallucination Check**:
```
Before using any external API or module:
□ Does CODE_INVENTORY.md mention this?
□ Is there an existing test showing usage?
□ Have I seen the actual method signature?
□ Does the parameter order match what I'm using?
□ Does it return what I expect?
□ Could there be a different API by the same name?
```

---

### C3: Context Continuity

**DO**:
- ✅ Maintain clear context about task: what am I building? why?
- ✅ Update CODE_INVENTORY.md as you add code
- ✅ Update LOGS.md when making decisions
- ✅ Create commit messages that tell story
- ✅ Link related changes: "see commit XYZ for context"

**DON'T**:
- ❌ Write code in isolation; lose context
- ❌ Add code without updating CODE_INVENTORY.md
- ❌ Make decisions without documenting why
- ❌ Write vague commit messages
- ❌ Forget what you decided 5 commits ago

---

### C4: Loss of Context Recovery

**When context is lost (long task, multiple steps, returning to code later)**:

**DO**:
- ✅ Read LOGS.md for recent decisions and changes
- ✅ Read CODE_INVENTORY.md to remember what exists
- ✅ Read git history: `git log --oneline --graph`
- ✅ Check related PRs and issues
- ✅ Run test suite to verify current state
- ✅ Create a brief summary of where things stand

**DON'T**:
- ❌ Assume you remember the previous context
- ❌ Write code without re-grounding yourself
- ❌ Skip reading recent changes
- ❌ Assume tests still pass

---

## Common Mistakes to Avoid

### M1: The "Duct Tape Fix"

**Mistake**: Adding a quick fix without addressing root cause
```javascript
// ❌ Duct tape: payment fails sometimes, so retry forever
while (true) {
  try {
    return await chargeCard(card, amount);
  } catch (err) {
    // No limit; infinite retry loop
    // If it always fails, we're stuck
  }
}

// ✅ Real fix: understand why it fails and handle properly
const maxRetries = 3;
const backoff = [1000, 2000, 5000];  // exponential backoff

for (let i = 0; i < maxRetries; i++) {
  try {
    return await chargeCard(card, amount);
  } catch (err) {
    if (i === maxRetries - 1) {
      throw new PaymentFailedException(`Failed after ${maxRetries} retries: ${err.message}`);
    }
    await sleep(backoff[i]);
  }
}
```

---

### M2: The "Magic String"

**Mistake**: Hard-coded strings that should be constants
```javascript
// ❌ Magic strings: where do these come from? Why these values?
if (order.status === 'PENDING_PAYMENT') {
  // ...
}

if (error.code === 'STRIPE_ERROR_DECLINED') {
  // ...
}

// ✅ Named constants: clear where they come from, easy to change
const ORDER_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED'
};

const PAYMENT_ERROR = {
  DECLINED: 'STRIPE_ERROR_DECLINED',
  INSUFFICIENT_FUNDS: 'STRIPE_ERROR_INSUFFICIENT_FUNDS'
};

if (order.status === ORDER_STATUS.PENDING_PAYMENT) {
  // ...
}
```

---

### M3: The "Future-Proof" Over-Engineering

**Mistake**: Building for features that don't exist yet
```javascript
// ❌ Over-engineered: built for hypothetical needs
class UserRepositoryFactory {
  createRepository(type, config) {
    switch (type) {
      case 'mongo': return new MongoUserRepository(config);
      case 'postgres': return new PostgresUserRepository(config);
      case 'elasticsearch': return new ElasticsearchUserRepository(config);
      case 'dynamodb': return new DynamoDBUserRepository(config);
      // ... 10 more implementations for databases we'll never use
    }
  }
}

// ✅ Real approach: build only what's needed, extend when needed
class UserRepository {
  // Postgres implementation (what we use today)
}

// If we need another database later, create UserRepositoryAdapter or switch implementations
```

---

### M4: The "Trust Me" Test

**Mistake**: Writing tests that don't actually test
```javascript
// ❌ Test that doesn't verify anything
test('calculateTotal should work', () => {
  const result = calculateTotal(items);
  // No assertion! Test passes if function doesn't crash
});

// ✅ Real test: verifies behavior
test('calculateTotal should sum item prices and apply tax', () => {
  const items = [
    { price: 100, quantity: 1 },
    { price: 50, quantity: 2 }
  ];
  const result = calculateTotal(items, 0.1);
  expect(result).toBe(110 + 100 + 11);  // (100 + 100) + ((100 + 100) * 0.1)
});
```

---

### M5: The "Silent Failure"

**Mistake**: Errors that don't surface
```javascript
// ❌ Silent failure: error caught but not logged or handled
database.connect().catch(err => {
  // Silently fails; nobody knows connection failed
});

// ✅ Real error handling: log and fail visibly
database.connect().catch(err => {
  logger.error('database_connection_failed', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);  // Fail fast; don't start with no database
});
```

---

### M6: The "Temporary Variable"

**Mistake**: Variables that stick around forever
```javascript
// ❌ "Temporary" refactoring (committed as-is)
const temp = processData(data);
const temp2 = filterData(temp);
const temp3 = sortData(temp2);
return temp3;

// ✅ Clear naming: temporary is fine during refactoring, not in final code
const processed = processData(data);
const filtered = filterData(processed);
const sorted = sortData(filtered);
return sorted;
```

---

### M7: The "Defensive Programming" Cargo Cult

**Mistake**: Defending against impossible scenarios
```javascript
// ❌ Over-defensive: defending against things that can't happen
function calculateTotal(items) {
  if (!items) return 0;  // Already destructured; can't be null
  if (typeof items !== 'array') return 0;  // Runtime type check in typed language
  if (items.length === 0) return 0;  // Handled in loop anyway
  
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    if (items[i] === null) continue;  // Already validated on input
    if (items[i].price === undefined) continue;  // Already typed
    total += items[i].price;
  }
  return total;
}

// ✅ Realistic error handling: validate inputs, trust the rest
function calculateTotal(items: Item[]): number {
  if (!items || items.length === 0) return 0;
  
  return items.reduce((sum, item) => sum + (item.price || 0), 0);
}
```

---

### M8: The "It Works on My Machine"

**Mistake**: Untested assumptions about environments
```javascript
// ❌ Environment assumptions
const databaseUrl = 'postgresql://user:password@localhost:5432/mydb';
const apiKey = 'sk_live_abc123';  // Hardcoded production key!

// ✅ Environment-aware configuration
const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost/mydb_dev';
const apiKey = process.env.STRIPE_API_KEY;

if (!apiKey) {
  throw new Error('STRIPE_API_KEY environment variable not set');
}
```

---

### M9: The "Code Review Skip"

**Mistake**: Not waiting for code review before deployment
```javascript
// ❌ Deployed without review, broke production
git push origin main
git push prod origin/main

// ✅ Proper flow: code → review → test → deploy
git push origin feature-branch
// Create PR, wait for review and approval
// CI/CD runs all tests, linting, security checks
// Deploy to staging, verify
// Deploy to production only after review + tests + staging verification
```

---

### M10: The "TODO Forever"

**Mistake**: TODO comments that never get done
```javascript
// ❌ TODO with no owner, no ticket, no deadline
// TODO: refactor this function

// TODO: add caching here

// TODO: fix this logic

// ✅ Real TODO: owner + ticket + deadline
// TODO(alice): refactor to extract validation logic [TICKET-456] [DEADLINE: 2026-02-01]

// TODO(bob): add caching; currently recalculating on every request [PERF-789]

// TODO(security-team): validate all user inputs [SECURITY-AUDIT-2026-Q1]
```

---

## Approval & Confirmation Protocol

### Before Marking Implementation as "Complete"

**The AI Agent MUST**:

1. **Explicitly Ask for Confirmation**:
   ```
   "Implementation complete. Confirming with vibecoder:
   
   ✓ All tests pass (existing + new)
   ✓ Code follows guidelines
   ✓ Logging added
   ✓ Documentation updated (LOGS.md, ARCHITECTURE.md, CODE_INVENTORY.md, RUNBOOK.md)
   ✓ Regression tests added
   ✓ Security verified
   ✓ Performance acceptable
   
   Ready to proceed? [WAITING FOR CONFIRMATION]"
   ```

2. **Wait for Explicit Approval**:
   - Don't assume approval
   - Don't proceed until vibecoder confirms
   - Document the confirmation timestamp

3. **Final Checklist**:
   ```
   ☑ Has vibecoder explicitly approved?
   ☑ Are all requirements met?
   ☑ Is documentation current?
   ☑ Are logs comprehensive?
   ☑ Can you deploy this now?
   ```

---

## Summary: The Golden Rules

1. **Code is for humans**: clarity > cleverness
2. **Measurement over guessing**: profile before optimizing
3. **Tests enable fearlessness**: write tests first
4. **Logs tell stories**: debug with logs before closing
5. **Documentation is living**: update as you code
6. **Security is non-negotiable**: validate everything
7. **Never break good code**: extend, don't rewrite
8. **Ask for confirmation**: don't assume completion
9. **Context is everything**: read CODE_INVENTORY before coding
10. **Clean code is faster code**: no shortcuts

---

**End of Rulebook**

