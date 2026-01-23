# IDE AI Agent Coding Excellence Guidebook

**Version**: 1.0  
**Last Updated**: January 2026  
**Purpose**: Comprehensive directive set for AI code generation agents to produce enterprise-grade, maintainable, performant, and testable code

---

## Table of Contents

1. [Philosophy & Principles](#philosophy--principles)
2. [Domain 1: Code Quality & Maintainability](#domain-1-code-quality--maintainability)
3. [Domain 2: System Architecture & Design](#domain-2-system-architecture--design)
4. [Domain 3: Test-Driven Development](#domain-3-test-driven-development)
5. [Domain 4: Performance & Optimization](#domain-4-performance--optimization)
6. [Domain 5: Design Patterns & Reusability](#domain-5-design-patterns--reusability)
7. [Decision Trees](#decision-trees)
8. [Integration Framework](#integration-framework)
9. [Prompt Templates](#prompt-templates)
10. [Anti-Patterns Registry](#anti-patterns-registry)
11. [Metrics & Validation](#metrics--validation)

---

## Philosophy & Principles

### Core Axioms

These principles are non-negotiable and should guide every line of code generated:

1. **Code is for Humans First, Machines Second**
   - The primary reader of code is a human developer, not a compiler/interpreter
   - Clarity and intent matter more than brevity
   - Maintainability is a feature, not an afterthought
   - Tomorrow's developer may be you under time pressure; be kind to them

2. **Simplicity Over Cleverness**
   - "The simplest thing that could possibly work" is the starting point
   - Clever solutions are acceptable only if they solve validated bottlenecks
   - When choosing between two solutions of equal merit, pick the simpler one
   - Complexity should be justified by clear, measurable benefit

3. **Measurement Before Optimization**
   - Never optimize without data
   - Benchmark before and after optimization attempts
   - Profile against real workloads, not synthetic benchmarks
   - Document why each optimization exists; remove it if assumptions change

4. **Code is Communication**
   - Names should reveal intent without requiring comments
   - Structure should tell a story: dependencies visible, responsibilities clear
   - Comments explain *why*, not *what*; if *what* is unclear, rename
   - Consistency in patterns enables rapid understanding

5. **Change is Inevitable; Design for It**
   - Assume requirements will change (because they will)
   - Write code that enables safe refactoring
   - Prefer reversible decisions; avoid point-of-no-return architectures
   - Keep options open until the last responsible moment

### Hierarchy of Concerns

When generating code, prioritize in this order (top tier blocks lower tiers):

```
1. CORRECTNESS: Does the code work? Does it handle edge cases?
   ↓
2. TESTABILITY: Can this code be tested in isolation? Is it verifiable?
   ↓
3. CLARITY: Would another developer understand this in 5 minutes?
   ↓
4. MAINTAINABILITY: Can this code be safely changed without breaking things?
   ↓
5. REUSABILITY: Can this code be composed with other modules?
   ↓
6. PERFORMANCE: Is this fast enough? Do we need to optimize?
```

---

## Domain 1: Code Quality & Maintainability

### 1.1 Naming Standards

#### 1.1.1 Variables & Constants

**Rule**: Names should answer "what does this represent?" without requiring documentation.

**Anti-Patterns**:
```javascript
// ❌ Single letters (unless loop index)
let d = 5;
let x = userData.map(...);

// ❌ Hungarian notation (type embedded in name)
let strName = "John";
let arrUsers = [...];
let boolIsActive = true;

// ❌ Abbreviations that aren't universal
let usr = getUser();
let cfg = loadConfiguration();
```

**Patterns**:
```javascript
// ✅ Clear, searchable, intention-revealing
const maxRetryAttempts = 5;
const usersByDepartment = userData.map(...);
const isActive = true;

// ✅ Pronounceable names
const generationTimestamp = Date.now();
const searchResults = performSearch(query);

// ✅ Domains where single letters are acceptable
for (let i = 0; i < items.length; i++) { }  // i, j, k for loops only
```

**Guidelines**:
- Boolean variables should begin with `is`, `has`, `can`, `should`, `do`, `will`
  - Example: `isAuthenticated`, `hasPermission`, `canDelete`, `shouldRetry`
- Collection names should be plural
  - Example: `users`, `activeTaskIds`, `departmentTeams`
- Time-related: include `At`, `Until`, `Since`
  - Example: `createdAt`, `expiresUntil`, `lastModifiedAt`
- Single-letter variables: acceptable only for loop indices (`i`, `j`, `k`) or established math conventions

#### 1.1.2 Functions & Methods

**Rule**: Function names should be verbs describing the action; their signature should reveal inputs and outputs.

**Anti-Patterns**:
```javascript
// ❌ Ambiguous action
function process(data) { }
function handle(input) { }
function execute() { }

// ❌ Doesn't reveal what it returns
function getUserData(id) { }  // Does it return a user or user data? Fetch or compute?
function getStatus() { }  // What status? Which entity?

// ❌ Lies about side effects
function getUser(id) {  // Name suggests read-only, but...
  this.cache.clear();   // has side effects!
  this.logger.log('accessed user');
  return fetchFromDatabase(id);
}
```

**Patterns**:
```javascript
// ✅ Clear action
function fetchUserById(id) { }
function validateEmailFormat(email) { }
function calculateOrderTotal(items, taxRate) { }

// ✅ Reveals return type in name
function getUsersAsArray() { }
function buildConfigurationObject() { }
function getUserIdOrThrow(id) { }

// ✅ Side effects explicit
function logUserAccessAndFetchUser(id) { }
function clearCacheAndReloadSettings() { }

// If many side effects, consider a class/object:
userManager.fetch(id);  // Implies side effects are handled within
```

**Guidelines**:
- Query methods (read-only): `get`, `fetch`, `find`, `retrieve`, `compute`
- Mutation methods: `set`, `update`, `delete`, `create`, `save`, `clear`
- Validation methods: `validate`, `verify`, `check`, `is*`, `has*`, `can*`
- Conversion methods: `to*`, `as*`, `from*`
- Compound actions: combine verb forms: `fetchAndCache`, `validateAndSave`, `loadAndParse`

#### 1.1.3 Classes & Modules

**Rule**: Class names are nouns; module names reveal purpose or domain.

**Patterns**:
```javascript
// ✅ Nouns describing what the class represents
class UserRepository { }
class OrderProcessor { }
class AuthenticationService { }
class PaymentValidator { }

// ✅ Module/file names reveal purpose
// services/userService.js
// repositories/orderRepository.js
// utils/dateUtils.js
// middleware/authenticationMiddleware.js
```

### 1.2 Single Responsibility Principle (SRP)

**Rule**: Each function, class, or module should have exactly one reason to change.

**Test**: If you struggle to describe the responsibility in one sentence without using "and", the responsibility is split.

**Anti-Patterns**:

```javascript
// ❌ Multiple responsibilities
class UserManager {
  // Responsibility 1: User CRUD
  createUser(data) { /* ... */ }
  updateUser(id, data) { /* ... */ }
  deleteUser(id) { /* ... */ }
  
  // Responsibility 2: Authentication
  authenticate(username, password) { /* ... */ }
  generateJWT(user) { /* ... */ }
  validateToken(token) { /* ... */ }
  
  // Responsibility 3: Logging
  logUserAction(userId, action) { /* ... */ }
  
  // Responsibility 4: Email notifications
  sendWelcomeEmail(user) { /* ... */ }
  sendPasswordResetEmail(user) { /* ... */ }
}

// Changes needed? User storage strategy changes? Breaks 5 things.
// Auth library upgrades? Breaks 3 things.
```

**Refactored (SRP Compliant)**:

```javascript
// ✅ Each class has ONE reason to change
class UserRepository {
  create(data) { /* store user */ }
  update(id, data) { /* update user */ }
  delete(id) { /* delete user */ }
  // Changes: only if storage mechanism changes
}

class AuthenticationService {
  authenticate(username, password) { /* verify credentials */ }
  generateJWT(user) { /* create token */ }
  validateToken(token) { /* verify token */ }
  // Changes: only if auth strategy changes
}

class UserLogger {
  logAction(userId, action) { /* record action */ }
  // Changes: only if logging mechanism changes
}

class UserNotificationService {
  sendWelcomeEmail(user) { /* send welcome */ }
  sendPasswordResetEmail(user) { /* send reset */ }
  // Changes: only if notification strategy changes
}

class UserManager {
  constructor(repository, authService, logger, notificationService) {
    this.repository = repository;
    this.auth = authService;
    this.logger = logger;
    this.notifications = notificationService;
  }
  
  registerNewUser(userData) {
    const user = this.repository.create(userData);
    this.logger.logAction(user.id, 'REGISTERED');
    this.notifications.sendWelcomeEmail(user);
    return user;
  }
}

// Now each class changes for ONE reason; orchestration happens in UserManager
```

**Benefits**:
- Testing: mock individual responsibilities independently
- Maintenance: change authentication without touching user storage
- Reusability: UserRepository can be used anywhere users are stored
- Scalability: can swap implementations (e.g., database → cache → API)

### 1.3 DRY: Don't Repeat Yourself

**Rule**: If code appears in two or more places, it should be abstracted into a reusable unit.

**Levels of DRY Violation**:

```javascript
// ❌ Level 1: Identical code copy-pasted
function validateUserEmail(email) {
  if (!email || email.indexOf('@') === -1) {
    return false;
  }
  return true;
}

function validateAdminEmail(email) {
  if (!email || email.indexOf('@') === -1) {  // DUPLICATED!
    return false;
  }
  return true;
}

// ✅ Abstract to reusable function
function isValidEmail(email) {
  if (!email || email.indexOf('@') === -1) {
    return false;
  }
  return true;
}

function validateUserEmail(email) {
  return isValidEmail(email);
}

function validateAdminEmail(email) {
  return isValidEmail(email);
}

// Or even simpler:
const validateUserEmail = isValidEmail;
const validateAdminEmail = isValidEmail;
```

```javascript
// ❌ Level 2: Similar logic, different details (still DRY violation)
function fetchUserData(userId) {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch user');
  const data = await response.json();
  return data;
}

function fetchOrderData(orderId) {
  const response = await fetch(`/api/orders/${orderId}`);  // Similar pattern!
  if (!response.ok) throw new Error('Failed to fetch order');
  const data = await response.json();
  return data;
}

// ✅ Parameterized function
function fetchResourceData(endpoint) {
  return async (resourceId) => {
    const response = await fetch(`/api/${endpoint}/${resourceId}`);
    if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
    return response.json();
  };
}

const fetchUserData = fetchResourceData('users');
const fetchOrderData = fetchResourceData('orders');
```

```javascript
// ❌ Level 3: Business logic duplication across modules
// in userService.js
function calculateDiscount(totalAmount) {
  if (totalAmount > 1000) return totalAmount * 0.1;
  if (totalAmount > 500) return totalAmount * 0.05;
  return 0;
}

// in orderService.js
function calculateOrderDiscount(total) {  // SAME LOGIC!
  if (total > 1000) return total * 0.1;
  if (total > 500) return total * 0.05;
  return 0;
}

// ✅ Extract to shared business logic
// in discountCalculator.js
function calculateDiscount(amount) {
  const TIER_1_THRESHOLD = 1000;
  const TIER_1_RATE = 0.1;
  const TIER_2_THRESHOLD = 500;
  const TIER_2_RATE = 0.05;
  
  if (amount > TIER_1_THRESHOLD) return amount * TIER_1_RATE;
  if (amount > TIER_2_THRESHOLD) return amount * TIER_2_RATE;
  return 0;
}

// Use everywhere
const userDiscount = calculateDiscount(totalAmount);
const orderDiscount = calculateDiscount(total);
```

**Benefits**:
- Bug fix: one place to fix, everywhere gets the fix
- Maintenance: changes in logic happen once
- Consistency: guarantee same behavior across codebase
- Testability: test the abstraction once, all consumers benefit

### 1.4 Functions: Scope, Size, and Abstraction Levels

**Rule**: Functions should be small (fit on one screen), with consistent abstraction levels, and clear input/output contracts.

#### 1.4.1 Function Size

**Ideal**: 1-20 lines of code per function

**Why**:
- Fits on one screen without scrolling
- Testable as an atomic unit
- Readable in one mental context
- Easy to understand at a glance
- Easier to refactor and reuse

**Anti-Pattern**:
```javascript
// ❌ 100+ line function
function processUserRegistration(userData, emailService, logger, database) {
  // Validate
  if (!userData.email || !userData.password || !userData.name) {
    throw new Error('Missing required fields');
  }
  
  // Check email format
  if (!userData.email.includes('@')) {
    throw new Error('Invalid email');
  }
  
  // Hash password
  const hashedPassword = bcrypt.hashSync(userData.password, 10);
  
  // Create user record
  const user = {
    id: uuid.v4(),
    email: userData.email,
    password: hashedPassword,
    name: userData.name,
    createdAt: new Date(),
    verified: false
  };
  
  // Save to database
  const saved = await database.users.insert(user);
  
  // Send welcome email
  await emailService.sendWelcomeEmail(user.email, user.name);
  
  // Log event
  logger.info(`User registered: ${user.email}`);
  
  // Return result
  return {
    success: true,
    userId: user.id,
    message: 'Registration successful'
  };
}

// Single function doing: validation, hashing, database, email, logging
// Changes needed? All bundled together; hard to test; violates SRP
```

**Refactored**:
```javascript
// ✅ Composed of small, focused functions
function validateRegistrationData(userData) {
  if (!userData.email || !userData.password || !userData.name) {
    throw new Error('Missing required fields');
  }
  if (!userData.email.includes('@')) {
    throw new Error('Invalid email format');
  }
}

function createUserObject(email, plainPassword, name) {
  return {
    id: uuid.v4(),
    email,
    password: hashPassword(plainPassword),
    name,
    createdAt: new Date(),
    verified: false
  };
}

function hashPassword(plainPassword) {
  return bcrypt.hashSync(plainPassword, 10);
}

async function registerUser(userData, dependencies) {
  validateRegistrationData(userData);
  
  const user = createUserObject(userData.email, userData.password, userData.name);
  const savedUser = await dependencies.database.users.insert(user);
  
  await dependencies.emailService.sendWelcomeEmail(savedUser.email, savedUser.name);
  dependencies.logger.info(`User registered: ${savedUser.email}`);
  
  return { success: true, userId: savedUser.id };
}

// Each function: one responsibility, easy to test, easy to understand, easy to reuse
```

#### 1.4.2 Abstraction Levels

**Rule**: All statements in a function should be at the same level of abstraction.

**Anti-Pattern** (mixing levels):
```javascript
// ❌ Function mixes high-level and low-level logic
function getUserSummary(userId) {
  // High level: "get user"
  const user = fetchUser(userId);
  
  // Low level: string manipulation
  const firstName = user.name.split(' ')[0];
  const lastInitial = user.name.split(' ')[1][0];
  
  // Medium level: aggregate data
  const orderCount = database.orders.count({ userId });
  
  // Low level: formatting
  const summary = {
    name: `${firstName} ${lastInitial}.`,
    orders: orderCount,
    joinDate: user.createdAt.toLocaleDateString()
  };
  
  return summary;
}

// Reader jumps between: high-level concepts, string operations, queries, formatting
```

**Refactored** (consistent abstraction level):
```javascript
// ✅ Function stays at one level: orchestration
function getUserSummary(userId) {
  const user = fetchUser(userId);
  const orderCount = countUserOrders(userId);
  return formatUserSummary(user, orderCount);
}

// Supporting functions handle details at their appropriate level
function countUserOrders(userId) {
  return database.orders.count({ userId });
}

function formatUserSummary(user, orderCount) {
  return {
    name: formatUserName(user.name),
    orders: orderCount,
    joinDate: formatDate(user.createdAt)
  };
}

function formatUserName(fullName) {
  const parts = fullName.split(' ');
  return `${parts[0]} ${parts[1][0]}.`;
}

function formatDate(date) {
  return date.toLocaleDateString();
}

// Each function operates at ONE level of abstraction
// Reader can follow the "story" at their chosen level of detail
```

### 1.5 Comments: When & How

**Rule**: Comments explain *why*, not *what*. If *what* is unclear, fix the code, not add comments.

**Anti-Patterns**:

```javascript
// ❌ Comments state the obvious
function calculateTotal(items) {
  let total = 0;  // Initialize total
  
  for (let i = 0; i < items.length; i++) {  // Loop through items
    total += items[i].price;  // Add price to total
  }
  
  return total;  // Return the total
}

// ❌ Comments that drift from code (lies)
function getUserEmail(id) {
  // Returns user's primary email address
  return database.query(`SELECT * FROM users WHERE id = ?`, id).email;  // Actually returns ENTIRE user object!
}

// ❌ Commented-out code
function processOrder(order) {
  validateOrder(order);
  // const discount = calculateDiscount(order);  // Commented out, nobody knows why
  // const finalTotal = order.total - discount;
  const finalTotal = order.total;
  persistOrder(finalTotal);
}
```

**Patterns**:

```javascript
// ✅ Comments explain non-obvious decisions
function calculateDiscount(amount) {
  // Tier thresholds set by pricing committee (Q4 2025 pricing model)
  // Update requires stakeholder approval; see ticket #PRICING-2024
  if (amount > 1000) return amount * 0.1;
  if (amount > 500) return amount * 0.05;
  return 0;
}

// ✅ Comments explain architectural decisions
class CacheLayer {
  // We use LRU cache to prevent memory bloat on long-running servers
  // Profiling showed 80% of requests hit top 500 products; LRU keeps hot items
  constructor() {
    this.cache = new LRUCache({ maxSize: 500 });
  }
}

// ✅ Comments warn about gotchas
function parseDate(dateString) {
  // WARNING: JavaScript Date constructor is timezone-aware
  // Always use explicit UTC parsing or parsing libraries to avoid bugs
  return new Date(dateString);
}

// ✅ Comments document non-obvious behavior
function getUserOrDefault(id, fallback = {}) {
  try {
    return fetchUser(id);
  } catch (error) {
    // User not found is expected in some flows (e.g., invitations)
    // Return fallback instead of crashing
    return fallback;
  }
}

// ✅ Block comments for complex algorithms
function calculateOptimalShippingRoute(orders, warehouses) {
  // Traveling Salesman Problem approximation: greedy nearest-neighbor
  // Complexity: O(n²) instead of O(n!) for brute force
  // Good enough for <50 orders; if larger dataset, consider Christofides algorithm
  
  // Implementation...
}
```

**Guidelines**:
- Good comments explain: *why* decisions were made, *what assumptions* are in place, *what gotchas* exist
- Comments should not restate the code
- Remove commented-out code; use version control to recover it
- For complex algorithms, explain the approach and complexity
- For non-obvious business logic, link to requirements or tickets

---

## Domain 2: System Architecture & Design

### 2.1 Coupling & Cohesion

**Principle**: Low Coupling (modules are independent) + High Cohesion (related code stays together) = Maintainable systems.

#### 2.1.1 Coupling: Reduce It

**Definition**: Coupling is how dependent modules are on each other. Low coupling = easy to change one module without affecting others.

**Types of Coupling**:

```javascript
// ❌ TIGHT COUPLING: Direct dependencies on concrete implementations
class UserService {
  constructor() {
    this.database = new MySQLDatabase();  // Hard-coded concrete class
    this.emailService = new GmailService();  // Hard-coded concrete class
    this.logger = new FileLogger();  // Hard-coded concrete class
  }
  
  async createUser(userData) {
    this.database.insert(userData);
    this.emailService.send(...);
    this.logger.write(...);
  }
}

// Problems:
// - Can't test without real database, email service, file system
// - Changing email provider requires changing UserService
// - Hard to swap implementations for different environments (dev, staging, prod)
```

**✅ LOOSE COUPLING: Depend on interfaces/abstractions, not concrete implementations**:

```javascript
// Define contracts (interfaces)
interface IDatabase {
  insert(data);
  find(query);
}

interface IEmailService {
  send(to, subject, body);
}

interface ILogger {
  write(message);
}

// Inject dependencies
class UserService {
  constructor(database, emailService, logger) {
    this.database = database;  // Any database implementing IDatabase
    this.emailService = emailService;  // Any email service
    this.logger = logger;  // Any logger
  }
  
  async createUser(userData) {
    this.database.insert(userData);
    this.emailService.send(...);
    this.logger.write(...);
  }
}

// Testing is trivial: pass mock implementations
const mockDatabase = { insert: jest.fn(), find: jest.fn() };
const mockEmailService = { send: jest.fn() };
const mockLogger = { write: jest.fn() };

const service = new UserService(mockDatabase, mockEmailService, mockLogger);
service.createUser(testData);
expect(mockDatabase.insert).toHaveBeenCalled();
```

**Practical Approaches**:

1. **Dependency Injection (DI)**: Pass dependencies into constructor or methods
2. **Factory Patterns**: Create objects through factories that hide concrete types
3. **Service Locator**: Central registry of services (less desirable; hides dependencies)
4. **Event-Driven**: Modules communicate via events, not direct calls

```javascript
// Example: Dependency Injection
class OrderProcessor {
  constructor(paymentService, inventoryService, notificationService) {
    this.payment = paymentService;
    this.inventory = inventoryService;
    this.notification = notificationService;
  }
  
  async processOrder(order) {
    await this.payment.charge(order);
    await this.inventory.reserve(order.items);
    await this.notification.sendConfirmation(order);
  }
}

// At composition root (main.js), wire everything:
const stripePayment = new StripePaymentService(stripeKey);
const warehouseInventory = new WarehouseInventoryService(warehouseAPI);
const emailNotification = new EmailNotificationService(emailProvider);

const processor = new OrderProcessor(stripePayment, warehouseInventory, emailNotification);
```

#### 2.1.2 Cohesion: Increase It

**Definition**: Cohesion is how strongly related elements within a module are. High cohesion = related code stays together.

```javascript
// ❌ LOW COHESION: Unrelated functionality in one place
class UserUtilities {
  // User-related
  validateUserEmail(email) { }
  formatUserName(name) { }
  
  // Payment-related (doesn't belong here!)
  calculateTaxAmount(total) { }
  processRefund(orderId) { }
  
  // Date-related (doesn't belong here!)
  formatDate(date) { }
  calculateDaysBetween(date1, date2) { }
  
  // String-related (doesn't belong here!)
  capitalizeString(str) { }
  parseCSV(csvData) { }
}

// Problems:
// - Class has many reasons to change
// - Hard to reuse individual functionality
// - Confusing: "Should date utility go here?"
```

**✅ HIGH COHESION: Related functionality grouped together**:

```javascript
// User domain
class UserValidator {
  validateEmail(email) { }
  validatePassword(password) { }
}

class UserFormatter {
  formatName(name) { }
  formatEmail(email) { }
}

// Payment domain
class TaxCalculator {
  calculateTax(amount) { }
}

class RefundProcessor {
  processRefund(orderId) { }
}

// Utility domain
class DateUtils {
  formatDate(date) { }
  calculateDaysBetween(date1, date2) { }
}

class StringUtils {
  capitalize(str) { }
  parseCSV(csvData) { }
}

// Each class has ONE domain; related code stays together; easy to find and reuse
```

### 2.2 SOLID Principles

The five SOLID principles are guidelines for OOP design. They work together to reduce coupling and increase cohesion.

#### 2.2.1 S: Single Responsibility Principle (SRP)

**Already covered in Section 1.2**

#### 2.2.2 O: Open/Closed Principle (OCP)

**Definition**: Software entities should be OPEN for extension, CLOSED for modification.

**Meaning**: Add new functionality without changing existing code.

```javascript
// ❌ CLOSED to extension: Adding new payment method requires modifying existing code
class PaymentProcessor {
  processPayment(order, paymentMethod) {
    if (paymentMethod === 'CREDIT_CARD') {
      // Process credit card
    } else if (paymentMethod === 'PAYPAL') {
      // Process PayPal
    } else if (paymentMethod === 'APPLE_PAY') {
      // Process Apple Pay
    }
    // PROBLEM: Adding new payment method? Modify this function!
  }
}
```

**✅ OPEN for extension: New payment methods without modifying**:

```javascript
// Define contract
interface PaymentMethod {
  process(order): Promise<PaymentResult>;
}

// Implementations
class CreditCardPayment implements PaymentMethod {
  process(order) { /* ... */ }
}

class PayPalPayment implements PaymentMethod {
  process(order) { /* ... */ }
}

class ApplePayPayment implements PaymentMethod {
  process(order) { /* ... */ }
}

// Processor delegates to implementations
class PaymentProcessor {
  processPayment(order, paymentMethod: PaymentMethod) {
    return paymentMethod.process(order);
  }
}

// NEW payment method? Create new class implementing PaymentMethod
class CryptoPayment implements PaymentMethod {
  process(order) { /* ... */ }
}

// No changes to PaymentProcessor! OPEN to extension, CLOSED to modification.
```

#### 2.2.3 L: Liskov Substitution Principle (LSP)

**Definition**: Derived classes must be substitutable for their base classes without breaking the system.

```javascript
// ❌ VIOLATES LSP: Derived class breaks contract
class Bird {
  fly() {
    return 'Flying...';
  }
}

class Penguin extends Bird {
  fly() {
    throw new Error('Penguins cannot fly');  // VIOLATES CONTRACT!
  }
}

// Client code assumes all Birds can fly
function makeBirdFly(bird: Bird) {
  return bird.fly();  // Crashes if bird is a Penguin!
}

// LSP violation: Penguin breaks the promise of Bird's interface
```

**✅ RESPECTS LSP: Correct hierarchy**:

```javascript
// More accurate: not all birds fly
class Bird { }

class FlyingBird extends Bird {
  fly() { return 'Flying...'; }
}

class Penguin extends Bird {
  swim() { return 'Swimming...'; }
}

// Now contract is honest: FlyingBird can fly, Penguin cannot
function makeFlyingBirdFly(bird: FlyingBird) {
  return bird.fly();  // Safe; all FlyingBirds can fly
}
```

**Key Insight**: If a derived class can't fulfill the parent's contract, the hierarchy is wrong.

#### 2.2.4 I: Interface Segregation Principle (ISP)

**Definition**: Clients should depend on specific, focused interfaces, not general ones.

```javascript
// ❌ FAT INTERFACE: Clients forced to depend on unneeded methods
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
}

class Robot implements Worker {
  work() { /* robot works */ }
  eat() { /* DOESN'T MAKE SENSE for robot */ }
  sleep() { /* DOESN'T MAKE SENSE for robot */ }
}

// Robot is forced to implement eat() and sleep() even though they make no sense
// Clients expecting eat() on a Robot are confused
```

**✅ SEGREGATED INTERFACES: Focused contracts**:

```javascript
interface Workable {
  work(): void;
}

interface Eatable {
  eat(): void;
}

interface Sleepable {
  sleep(): void;
}

class HumanWorker implements Workable, Eatable, Sleepable {
  work() { /* ... */ }
  eat() { /* ... */ }
  sleep() { /* ... */ }
}

class Robot implements Workable {
  work() { /* ... */ }
  // No eat() or sleep() forced on me
}

// Clients ask for what they need
function feedWorker(worker: Eatable) {
  worker.eat();  // Only callable on things that can eat
}

function runRobot(robot: Workable) {
  robot.work();  // Works for Robot, Human, any Workable
}
```

#### 2.2.5 D: Dependency Inversion Principle (DIP)

**Definition**: High-level modules should not depend on low-level modules. Both should depend on abstractions.

```javascript
// ❌ HIGH-LEVEL depends on LOW-LEVEL
class UserService {
  private database: PostgresDatabase;  // HIGH depends on LOW
  
  constructor() {
    this.database = new PostgresDatabase();  // Hard-coded dependency
  }
  
  async getUser(id) {
    return this.database.query(`SELECT * FROM users WHERE id = ?`, id);
  }
}

// Problems:
// - Can't use different database without changing UserService
// - Can't test without Postgres running
```

**✅ BOTH depend on ABSTRACTIONS**:

```javascript
// Define abstraction
interface Database {
  query(sql, params);
}

// Low-level implementations
class PostgresDatabase implements Database {
  query(sql, params) { /* ... */ }
}

class MongoDatabase implements Database {
  query(sql, params) { /* ... */ }
}

// High-level depends on abstraction, not concrete implementations
class UserService {
  private database: Database;
  
  constructor(database: Database) {
    this.database = database;  // Receives any Database implementation
  }
  
  async getUser(id) {
    return this.database.query(`SELECT * FROM users WHERE id = ?`, id);
  }
}

// Use with any database
const postgresService = new UserService(new PostgresDatabase());
const mongoService = new UserService(new MongoDatabase());
const mockService = new UserService(new MockDatabase());  // For testing
```

### 2.3 Evolutionary Architecture

**Principle**: Design systems to adapt as requirements change. Assume you don't know the future; make it cheap to be wrong.

#### 2.3.1 Looseness & Reversibility

**Guideline**: Every architectural decision should be reversible if assumptions change.

```javascript
// ❌ IRREVERSIBLE: Hard-coded, tightly coupled database choice
class DatabaseManager {
  constructor() {
    this.connection = new DirectPostgresConnection('postgresql://host/db');
    // If we need to switch databases, this is a massive refactor
  }
}

// ✅ REVERSIBLE: Abstraction + dependency injection
interface DatabaseConnection {
  query(sql, params);
  execute(sql, params);
}

class DatabaseManager {
  constructor(connection: DatabaseConnection) {
    this.connection = connection;
    // If we need to switch databases, just inject a different implementation
  }
}

// Easy to swap at startup
const connection = isProd 
  ? new PostgresConnection(prodConfig)
  : new SQLiteConnection(devConfig);
  
const manager = new DatabaseManager(connection);
```

#### 2.3.2 Fitness Functions

**Principle**: Automated guardrails that protect architectural goals and run continuously.

**Purpose**: Catch architectural violations before they become problems.

```javascript
// Fitness Functions: Tests that verify architectural rules

// ✅ Coupling fitness function
describe('Architectural coupling rules', () => {
  it('UserService should not import from HTTP module', () => {
    const content = fs.readFileSync('./src/services/UserService.ts', 'utf8');
    expect(content).not.toContain('from \'./http/');
  });
  
  it('Data layers should not import from UI layers', () => {
    const content = fs.readFileSync('./src/data/database.ts', 'utf8');
    expect(content).not.toContain('from \'./ui/');
  });
});

// ✅ Dependency layering fitness function
describe('Dependency direction rules', () => {
  it('Controllers should import Services, not opposite', () => {
    const controllerContent = fs.readFileSync('./src/controllers/OrderController.ts');
    const hasServiceImport = controllerContent.includes('from \'../services/OrderService\'');
    expect(hasServiceImport).toBe(true);
    
    const serviceContent = fs.readFileSync('./src/services/OrderService.ts');
    const hasControllerImport = serviceContent.includes('from \'../controllers/OrderController\'');
    expect(hasControllerImport).toBe(false);  // Should not depend on Controller
  });
});

// ✅ Package size fitness function
describe('Package boundary rules', () => {
  it('UserModule should not exceed 500KB', () => {
    const size = calculateBundleSize('./src/modules/user');
    expect(size).toBeLessThan(500000);
  });
});

// Run these tests in CI/CD; fail the build if rules violated
// Prevents architectural decay before it happens
```

#### 2.3.3 Bounded Contexts & Data Ownership

**Principle**: One system owns a dataset; others access via stable contracts (APIs, events).

```javascript
// ❌ Multiple systems accessing same database: Data ownership unclear
// OrderService and ShippingService both query users directly
class OrderService {
  async getOrder(orderId) {
    return db.query('SELECT * FROM orders JOIN users ON ...');
  }
}

class ShippingService {
  async getShippingDetails(orderId) {
    return db.query('SELECT * FROM orders JOIN users ON ...');
    // If User schema changes, both services break
  }
}

// ✅ Clear data ownership: UserService owns user data
class UserService {
  async getUser(userId) {
    return db.query('SELECT * FROM users WHERE id = ?', userId);
  }
  
  // Internal use only; other services should go through this
  async getUsersInBulk(userIds) {
    return db.query('SELECT * FROM users WHERE id IN (?)', userIds);
  }
}

class OrderService {
  constructor(userService) {
    this.userService = userService;
  }
  
  async getOrder(orderId) {
    const order = db.query('SELECT * FROM orders WHERE id = ?', orderId);
    const user = await this.userService.getUser(order.userId);
    return { ...order, user };
  }
}

class ShippingService {
  constructor(userService, orderService) {
    this.userService = userService;
    this.orderService = orderService;
  }
  
  async getShippingDetails(orderId) {
    const order = await this.orderService.getOrder(orderId);
    // User data accessed via UserService; if schema changes, only UserService adapts
    return { address: order.user.address, orderId };
  }
}

// Benefits:
// - Data ownership is explicit
// - Changes to User schema only affect UserService
// - Other services are isolated
```

### 2.4 Layers & Architecture Patterns

**Common architectural layers** (applied from high-level to low-level):

```
┌─────────────────────────────────────┐
│ Presentation / UI Layer             │ (Controllers, Views, API handlers)
├─────────────────────────────────────┤
│ Application / Service Layer         │ (Business orchestration, workflows)
├─────────────────────────────────────┤
│ Domain / Business Logic Layer       │ (Core rules, value objects, entities)
├─────────────────────────────────────┤
│ Infrastructure / Data Layer         │ (Database, APIs, external services)
├─────────────────────────────────────┤
│ Cross-cutting Concerns              │ (Logging, auth, error handling)
└─────────────────────────────────────┘
```

**Dependency Rules**: Lower layers don't know about upper layers.

```javascript
// ✅ CORRECT: Dependency points downward
PresentationLayer → ApplicationLayer → DomainLayer → InfrastructureLayer

class OrderController {  // Presentation
  constructor(orderService) {
    this.orderService = orderService;  // Depends on Application
  }
  
  async createOrder(req, res) {
    const order = await this.orderService.create(req.body);
    res.json(order);
  }
}

class OrderService {  // Application
  constructor(orderRepository) {
    this.orderRepository = orderRepository;  // Depends on Infrastructure
  }
  
  async create(orderData) {
    // Validates and saves
    return this.orderRepository.save(orderData);
  }
}

class OrderRepository {  // Infrastructure
  async save(order) {
    return database.insert('orders', order);
  }
}

// ❌ WRONG: Infrastructure trying to depend on Application
class OrderRepository {
  constructor(orderService) {  // NO! This is backward!
    this.orderService = orderService;
  }
}
```

---

## Domain 3: Test-Driven Development

### 3.1 The Three Laws of TDD

**Law 1**: You may not write production code unless it is to pass a failing test.

**Law 2**: You may not write more of a test than is sufficient to fail (compilation failures are failures).

**Law 3**: You may not write more production code than is sufficient to pass the test.

### 3.2 Red-Green-Refactor Cycle

**The TDD rhythm**:

```
┌─────────────────────────────────────────────────────────────┐
│ RED: Write failing test (just enough to fail)               │
├─────────────────────────────────────────────────────────────┤
│ GREEN: Write production code (just enough to pass)          │
├─────────────────────────────────────────────────────────────┤
│ REFACTOR: Improve code (keep it passing)                    │
└─────────────────────────────────────────────────────────────┘
```

**Example**:

```javascript
// STEP 1: RED - Write failing test
describe('ShoppingCart', () => {
  it('should calculate total price including tax', () => {
    const cart = new ShoppingCart();
    cart.addItem({ price: 100, quantity: 1 });
    
    expect(cart.getTotal(0.1)).toBe(110);  // 100 + (100 * 0.1)
  });
  // TEST FAILS: ShoppingCart class doesn't exist
});

// STEP 2: GREEN - Write minimal code to pass
class ShoppingCart {
  constructor() {
    this.items = [];
  }
  
  addItem(item) {
    this.items.push(item);
  }
  
  getTotal(taxRate) {
    let total = 0;
    for (let item of this.items) {
      total += item.price * item.quantity;
    }
    return total + (total * taxRate);
  }
}
// TEST PASSES

// STEP 3: REFACTOR - Improve without breaking
class ShoppingCart {
  constructor() {
    this.items = [];
  }
  
  addItem(item) {
    this.items.push(item);
  }
  
  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
  
  getTotal(taxRate) {
    const subtotal = this.getSubtotal();
    return subtotal + (subtotal * taxRate);
  }
}
// TEST STILL PASSES; code is cleaner
```

### 3.3 Testing Pyramid

**Principle**: Maximize fast, isolated tests; minimize slow, integration tests.

```
        ╱╲
       ╱  ╲       E2E / UI Tests (slow, brittle, few)
      ╱    ╲
     ╱──────╲
    ╱        ╲    Integration Tests (medium speed)
   ╱          ╲
  ╱────────────╲
 ╱              ╲  Unit Tests (fast, isolated, many)
╱________________╲
```

**Ratio**: 70% Unit Tests : 20% Integration Tests : 10% E2E Tests

**Unit Tests**:
- Test single functions or classes in isolation
- Mock external dependencies
- Fast (milliseconds)
- Run frequently (on every save)

```javascript
// ✅ Unit test: isolated, mocked dependencies
describe('ShoppingCart', () => {
  it('should apply discount code correctly', () => {
    const mockDiscountService = {
      getDiscount: jest.fn().mockResolvedValue(0.1)
    };
    
    const cart = new ShoppingCart(mockDiscountService);
    cart.addItem({ price: 100, quantity: 1 });
    
    const total = cart.getTotal('SAVE10');
    expect(total).toBe(90);  // 100 - 10
    expect(mockDiscountService.getDiscount).toHaveBeenCalledWith('SAVE10');
  });
});
```

**Integration Tests**:
- Test multiple components working together
- Use real (or containerized) databases/services
- Medium speed (seconds)
- Run on commits/PRs

```javascript
// ✅ Integration test: real database, real service interactions
describe('OrderService integration', () => {
  it('should create order and send confirmation email', async () => {
    const testDatabase = new TestDatabase();
    const testEmailService = new TestEmailService();
    const orderService = new OrderService(testDatabase, testEmailService);
    
    const order = await orderService.create({
      items: [{ productId: 1, quantity: 2 }],
      email: 'test@example.com'
    });
    
    expect(order.id).toBeDefined();
    expect(testEmailService.sentEmails).toHaveLength(1);
    expect(testEmailService.sentEmails[0].to).toBe('test@example.com');
  });
});
```

**E2E Tests**:
- Test full user workflows through UI
- Use real browser/app
- Slow (seconds to minutes)
- Run nightly or before release

```javascript
// ✅ E2E test: user flow through entire system
describe('User checkout flow', () => {
  it('should complete purchase from cart to confirmation', async () => {
    // User navigates to site
    await page.goto('https://shop.example.com');
    
    // User adds item to cart
    await page.click('button.add-to-cart');
    
    // User proceeds to checkout
    await page.click('button.checkout');
    
    // User fills payment form
    await page.fill('input[name=cardNumber]', '4111111111111111');
    await page.fill('input[name=expiry]', '12/25');
    
    // User submits
    await page.click('button[type=submit]');
    
    // Verify confirmation
    await expect(page).toContainText('Order confirmed');
  });
});
```

### 3.4 Test Naming & Clarity

**Pattern**: `test([Unit] should [behavior] [when condition])`

```javascript
// ✅ Clear test names
describe('UserValidator', () => {
  it('should return true when email is valid', () => { });
  it('should return false when email is missing @', () => { });
  it('should return false when email has no domain', () => { });
  it('should handle uppercase letters in email', () => { });
});

// Reader instantly understands what's tested and what's expected
```

### 3.5 Mocking & Isolation

**Principle**: Tests should test ONE thing; mock everything else.

```javascript
// ❌ Test not isolated: depends on external service
describe('PaymentProcessor', () => {
  it('should charge card successfully', async () => {
    const processor = new PaymentProcessor();
    const result = await processor.charge('4111111111111111', 100);
    // This ACTUALLY calls Stripe! 
    // - Slow (seconds)
    // - Requires internet
    // - May have random failures
    // - Not testing PaymentProcessor, testing Stripe
    expect(result.success).toBe(true);
  });
});

// ✅ Test isolated: external dependencies mocked
describe('PaymentProcessor', () => {
  it('should charge card successfully', () => {
    const mockStripeAPI = {
      charge: jest.fn().mockResolvedValue({ id: 'ch_123', amount: 100 })
    };
    
    const processor = new PaymentProcessor(mockStripeAPI);
    const result = processor.charge('4111111111111111', 100);
    
    // Tests PaymentProcessor's logic, not Stripe's
    expect(result.success).toBe(true);
    expect(mockStripeAPI.charge).toHaveBeenCalledWith(
      '4111111111111111',
      100,
      expect.any(Object)
    );
  });
});
```

### 3.6 Coverage Goals

**Target**: 80-90% code coverage by tests

- Coverage <60%: Code is untested; risk of regressions
- Coverage 80-90%: Good; most paths tested; edge cases may be missed
- Coverage >90%: Very good; high confidence; rare but possible: false positives (bad tests passing)

**Anti-Pattern**: Writing tests just to hit coverage goals (cargo cult testing)

```javascript
// ❌ Bad test: written for coverage, doesn't verify anything
function add(a, b) {
  return a + b;
}

it('should add two numbers', () => {
  add(2, 3);  // Calls the function but doesn't assert!
  // Coverage: ✅ (function was called)
  // Value: ❌ (nothing verified)
});

// ✅ Good test: verifies behavior
it('should add two numbers', () => {
  expect(add(2, 3)).toBe(5);
  expect(add(-1, 1)).toBe(0);
  expect(add(0, 0)).toBe(0);
});
```

---

## Domain 4: Performance & Optimization

### 4.1 Measurement Before Optimization

**Principle**: Profile your code; identify bottlenecks; optimize validated hotspots only.

**Process**:

```
1. MEASURE: Profile the system under realistic load
2. IDENTIFY: Find the actual bottleneck (usually not where you think)
3. OPTIMIZE: Apply targeted optimization
4. VERIFY: Measure again; confirm improvement
5. DOCUMENT: Explain why this optimization exists
6. REVIEW: Ensure optimization doesn't harm readability
```

**Anti-Pattern**: Premature optimization

```javascript
// ❌ Optimizing without measurement: guessing
class DataProcessor {
  process(items) {
    // "For loops are slow; let's use functional programming"
    return items
      .filter(item => item.active)
      .map(item => ({ ...item, processed: true }))
      .reduce((acc, item) => ({ ...acc, [item.id]: item }), {});
  }
}

// Might be slower due to intermediate array allocations!
// No measurement; just guessing.
```

**✅ Optimization with measurement**:

```javascript
// Step 1: Measure current performance
console.time('process');
processor.process(largeDataset);
console.timeEnd('process');  // 250ms

// Step 2: Identify bottleneck (use profiler)
// Profiler shows: 200ms in object spreading, 50ms in filtering

// Step 3: Optimize the bottleneck
class DataProcessor {
  process(items) {
    // Avoid repeated object spreading; mutate efficient
    const result = {};
    for (let i = 0; i < items.length; i++) {
      if (items[i].active) {
        items[i].processed = true;
        result[items[i].id] = items[i];
      }
    }
    return result;
  }
}

// Step 4: Verify improvement
console.time('process');
processor.process(largeDataset);
console.timeEnd('process');  // 80ms (68% faster!)

// Step 5: Document why
// "Replaced filter-map-reduce with imperative loop:
//  avoids 2 intermediate arrays, reduces object spreads.
//  Measured 68% improvement on 10K+ item datasets."

// Step 6: Review (performance gain justified the reduced readability)
```

### 4.2 Common Performance Patterns

#### 4.2.1 Memory Allocation

**Principle**: Minimize memory allocations; especially in hot loops.

```javascript
// ❌ Allocates new array on each loop iteration
function processItems(items) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    const processed = [];  // NEW allocation each loop!
    processed.push(items[i]);
    results.push(processed);
  }
  return results;
}

// ✅ Reuse objects; minimize allocations
function processItems(items) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    results.push([items[i]]);  // Single allocation
  }
  return results;
}

// Even better: pre-allocate if size known
function processItems(items) {
  const results = new Array(items.length);  // Allocate once
  for (let i = 0; i < items.length; i++) {
    results[i] = [items[i]];
  }
  return results;
}
```

#### 4.2.2 Caching

**Principle**: Cache expensive operations; invalidate when input changes.

```javascript
// ❌ Recalculates every time
class UserRepository {
  async getUser(id) {
    // Expensive database query
    return database.query('SELECT * FROM users WHERE id = ?', id);
  }
}

const user1 = await repo.getUser(5);  // Query
const user2 = await repo.getUser(5);  // Query again!
const user3 = await repo.getUser(5);  // Query again!

// ✅ Cache results
class UserRepository {
  constructor() {
    this.cache = new Map();
  }
  
  async getUser(id) {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    
    // Not cached; fetch
    const user = await database.query('SELECT * FROM users WHERE id = ?', id);
    this.cache.set(id, user);
    return user;
  }
  
  invalidateCache(id) {
    this.cache.delete(id);
  }
}

const user1 = await repo.getUser(5);  // Query
const user2 = await repo.getUser(5);  // Cache hit
const user3 = await repo.getUser(5);  // Cache hit
```

#### 4.2.3 Lazy Loading

**Principle**: Defer expensive operations until needed.

```javascript
// ❌ Loads everything upfront
class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.orders = this.loadOrders();  // Expensive, always loaded
    this.preferences = this.loadPreferences();  // Expensive, always loaded
  }
  
  loadOrders() {
    return database.query('SELECT * FROM orders WHERE user_id = ?', this.id);
  }
  
  loadPreferences() {
    return database.query('SELECT * FROM preferences WHERE user_id = ?', this.id);
  }
}

// Creating 1000 users? Loads 3000 queries upfront!

// ✅ Lazy load: load only when accessed
class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this._orders = null;
    this._preferences = null;
  }
  
  async getOrders() {
    if (!this._orders) {
      this._orders = await database.query('SELECT * FROM orders WHERE user_id = ?', this.id);
    }
    return this._orders;
  }
  
  async getPreferences() {
    if (!this._preferences) {
      this._preferences = await database.query('SELECT * FROM preferences WHERE user_id = ?', this.id);
    }
    return this._preferences;
  }
}

// Creating 1000 users? Zero queries. Only load what's accessed.
```

#### 4.2.4 Batching

**Principle**: Group multiple operations; reduce overhead.

```javascript
// ❌ Individual operations: overhead per operation
const userIds = [1, 2, 3, 4, 5];
const users = [];

for (let id of userIds) {
  const user = await database.query('SELECT * FROM users WHERE id = ?', id);
  users.push(user);
}
// 5 separate queries; 5x overhead

// ✅ Batch operation: single overhead
const userIds = [1, 2, 3, 4, 5];
const users = await database.query(
  'SELECT * FROM users WHERE id IN (?)',
  [userIds]
);
// 1 query; single overhead
```

### 4.3 Benchmarking

**Tool for measurement**: Structured benchmarking.

```javascript
// ✅ Simple benchmarking
function benchmark(label, fn, iterations = 1000) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const duration = performance.now() - start;
  console.log(`${label}: ${duration.toFixed(2)}ms (${(duration / iterations).toFixed(4)}ms per call)`);
}

// Compare approaches
benchmark('Loop vs Map', () => {
  const items = Array.from({ length: 1000 }, (_, i) => i);
  
  // Approach 1: Loop
  const result1 = [];
  for (let i = 0; i < items.length; i++) {
    result1.push(items[i] * 2);
  }
});

benchmark('Functional Map', () => {
  const items = Array.from({ length: 1000 }, (_, i) => i);
  const result2 = items.map(x => x * 2);
});

// Output helps decide which approach is faster
```

---

## Domain 5: Design Patterns & Reusability

### 5.1 When to Use Patterns

**Principle**: Patterns solve recurring problems. Use them when:
1. You recognize a recurring problem across multiple parts of your codebase
2. The pattern simplifies the solution compared to ad-hoc approaches
3. The team understands the pattern (shared vocabulary)

**Anti-Pattern**: Using patterns preemptively ("I might need Factory pattern")

### 5.2 Creational Patterns

These patterns manage object creation.

#### 5.2.1 Singleton

**Problem**: Need one instance of an object throughout the app (e.g., logger, configuration).

```javascript
// ✅ Singleton: guarantees single instance
class Logger {
  static instance = null;
  
  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  log(message) {
    console.log(`[${new Date()}] ${message}`);
  }
}

const logger1 = Logger.getInstance();
const logger2 = Logger.getInstance();
console.log(logger1 === logger2);  // true: same instance
```

#### 5.2.2 Factory

**Problem**: Creating objects based on runtime conditions; centralizing construction logic.

```javascript
// ✅ Factory: centralizes object creation
class PaymentMethodFactory {
  static create(type) {
    switch (type) {
      case 'CREDIT_CARD':
        return new CreditCardPayment();
      case 'PAYPAL':
        return new PayPalPayment();
      case 'CRYPTO':
        return new CryptoPayment();
      default:
        throw new Error(`Unknown payment method: ${type}`);
    }
  }
}

// Usage
const paymentMethod = PaymentMethodFactory.create('CREDIT_CARD');
```

#### 5.2.3 Builder

**Problem**: Complex object construction with many optional parameters.

```javascript
// ❌ Without builder: confusing constructor
const user = new User('john', 'john@example.com', 'password123', true, false, 'admin', ['read', 'write']);
// What are all these parameters? Hard to read.

// ✅ With builder: clear intent
const user = new UserBuilder()
  .withName('john')
  .withEmail('john@example.com')
  .withPassword('password123')
  .isActive(true)
  .isAdmin(true)
  .withPermissions(['read', 'write'])
  .build();

// Clear what each property is; easy to add/remove parameters
```

### 5.3 Structural Patterns

These patterns organize relationships between objects.

#### 5.3.1 Adapter

**Problem**: Using an interface when the API is different; bridging incompatible interfaces.

```javascript
// Incompatible APIs
class OldPaymentGateway {
  charge(amount, cardToken) {
    // Returns: { txId, status, message }
  }
}

class NewPaymentGateway {
  processPayment(paymentData) {
    // Returns: { transactionId, success, details }
  }
}

// ✅ Adapter: makes NewPaymentGateway compatible with expected interface
class PaymentGatewayAdapter {
  constructor(newGateway) {
    this.gateway = newGateway;
  }
  
  charge(amount, cardToken) {
    const result = this.gateway.processPayment({
      amount,
      token: cardToken
    });
    
    return {
      txId: result.transactionId,
      status: result.success ? 'SUCCESS' : 'FAILED',
      message: result.details
    };
  }
}

// Now NewPaymentGateway can be used everywhere OldPaymentGateway was expected
const gateway = new PaymentGatewayAdapter(new NewPaymentGateway());
```

#### 5.3.2 Decorator

**Problem**: Adding behaviors to objects dynamically without modifying them.

```javascript
// ✅ Decorator: adds functionality
class TextEditor {
  getText() {
    return 'Hello World';
  }
}

class BoldDecorator {
  constructor(editor) {
    this.editor = editor;
  }
  
  getText() {
    return `**${this.editor.getText()}**`;
  }
}

class ItalicDecorator {
  constructor(editor) {
    this.editor = editor;
  }
  
  getText() {
    return `*${this.editor.getText()}*`;
  }
}

// Compose decorators
let text = new TextEditor();
text = new BoldDecorator(text);
text = new ItalicDecorator(text);

console.log(text.getText());  // ***Hello World***
```

#### 5.3.3 Facade

**Problem**: Complex subsystem; provide simplified interface.

```javascript
// Complex subsystem with many parts
class EmailService { }
class SmsService { }
class LoggingService { }
class DatabaseService { }

// ✅ Facade: simplified interface
class NotificationFacade {
  constructor() {
    this.email = new EmailService();
    this.sms = new SmsService();
    this.logging = new LoggingService();
    this.database = new DatabaseService();
  }
  
  notifyUser(userId, message, method = 'email') {
    const user = this.database.getUser(userId);
    
    if (method === 'email') {
      this.email.send(user.email, message);
    } else if (method === 'sms') {
      this.sms.send(user.phone, message);
    }
    
    this.logging.log(`Notified user ${userId} via ${method}`);
  }
}

// Client uses single, simple method
const notifier = new NotificationFacade();
notifier.notifyUser(123, 'Welcome!', 'email');
```

### 5.4 Behavioral Patterns

These patterns manage communication and object interaction.

#### 5.4.1 Observer (Pub-Sub)

**Problem**: Object changes; notify multiple dependent objects.

```javascript
// ✅ Observer: decouple publishers from subscribers
class EventEmitter {
  constructor() {
    this.subscribers = {};
  }
  
  subscribe(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(callback);
  }
  
  emit(event, data) {
    if (this.subscribers[event]) {
      this.subscribers[event].forEach(callback => callback(data));
    }
  }
}

class UserService extends EventEmitter {
  createUser(userData) {
    const user = { id: uuid.v4(), ...userData };
    this.emit('userCreated', user);
    return user;
  }
}

// Subscribers
const emailService = new EmailService();
const analyticsService = new AnalyticsService();

const userService = new UserService();
userService.subscribe('userCreated', (user) => emailService.sendWelcome(user));
userService.subscribe('userCreated', (user) => analyticsService.trackSignup(user));

userService.createUser({ name: 'John' });  // Triggers both subscribers
```

#### 5.4.2 Strategy

**Problem**: Multiple algorithms; select at runtime.

```javascript
// ✅ Strategy: encapsulate algorithms
class SortingEngine {
  constructor(strategy) {
    this.strategy = strategy;
  }
  
  sort(items) {
    return this.strategy.sort(items);
  }
}

class QuickSortStrategy {
  sort(items) {
    // Quick sort implementation
  }
}

class MergeSortStrategy {
  sort(items) {
    // Merge sort implementation
  }
}

// Use different strategies based on context
const smallDataset = [3, 1, 2];
const sortEngine1 = new SortingEngine(new QuickSortStrategy());
sortEngine1.sort(smallDataset);

const largeDataset = Array.from({ length: 1000000 }, () => Math.random());
const sortEngine2 = new SortingEngine(new MergeSortStrategy());
sortEngine2.sort(largeDataset);
```

#### 5.4.3 Command

**Problem**: Encapsulate requests as objects; enable undo, logging, queuing.

```javascript
// ✅ Command: encapsulate requests
class Command {
  execute() { }
  undo() { }
}

class TransferFundsCommand extends Command {
  constructor(fromAccount, toAccount, amount) {
    this.fromAccount = fromAccount;
    this.toAccount = toAccount;
    this.amount = amount;
  }
  
  execute() {
    this.fromAccount.debit(this.amount);
    this.toAccount.credit(this.amount);
  }
  
  undo() {
    this.fromAccount.credit(this.amount);
    this.toAccount.debit(this.amount);
  }
}

class CommandInvoker {
  constructor() {
    this.history = [];
  }
  
  executeCommand(command) {
    command.execute();
    this.history.push(command);
  }
  
  undo() {
    const command = this.history.pop();
    if (command) {
      command.undo();
    }
  }
}

// Usage
const invoker = new CommandInvoker();
invoker.executeCommand(new TransferFundsCommand(accountA, accountB, 100));
invoker.executeCommand(new TransferFundsCommand(accountB, accountC, 50));

invoker.undo();  // Reverses second command
invoker.undo();  // Reverses first command
```

### 5.5 Composition over Inheritance

**Principle**: Objects should compose other objects to gain behavior, not inherit from classes.

**Why**:
- Inheritance creates tight coupling to parent behavior
- Composition is flexible; swap implementations easily
- Avoids "fragile base class" problem

```javascript
// ❌ Inheritance: brittle hierarchy
class Vehicle {
  startEngine() { }
  stopEngine() { }
}

class Car extends Vehicle {
  // Inherits startEngine, stopEngine
}

class Plane extends Vehicle {
  // Inherits startEngine, stopEngine
  // But planes don't have traditional "engines" like cars; confusing
}

// ❌ Adding features gets messy
class ElectricCar extends Car {
  // Now Car has both gas and electric methods? Confusing.
}

// ✅ Composition: clear, flexible
class Engine {
  start() { }
  stop() { }
}

class ElectricEngine extends Engine {
  // Specific to electric
}

class GasEngine extends Engine {
  // Specific to gas
}

class Car {
  constructor(engine) {
    this.engine = engine;  // Composed
  }
  
  start() {
    this.engine.start();
  }
  
  stop() {
    this.engine.stop();
  }
}

class Plane {
  constructor(engine) {
    this.engine = engine;  // Composed
  }
  
  start() {
    this.engine.start();
  }
  
  stop() {
    this.engine.stop();
  }
}

// Easy to create variations
const electricCar = new Car(new ElectricEngine());
const gasCar = new Car(new GasEngine());
const commercialPlane = new Plane(new JetEngine());
```

---

## Integration Framework

### Decision Tree: Which Pattern/Principle to Apply?

```
START: Code generation task
│
├─ "Is this a new feature?"
│  ├─ YES → Apply TDD (Domain 3)
│  │  └─ Write test → Write code → Refactor
│  │
│  └─ NO (modifying existing)
│     └─ "Will change be easy to test?"
│        ├─ NO → Refactor for testability first (Domain 1.2-1.4)
│        └─ YES → Proceed with confidence
│
├─ "Is this code potentially reusable?"
│  ├─ YES → Reduce coupling (Domain 2.1)
│  │  └─ Use dependency injection; program to interfaces
│  │
│  └─ NO (one-off utility)
│     └─ Prioritize clarity (Domain 1.1-1.3)
│
├─ "Is performance critical?"
│  ├─ YES → Profile first (Domain 4.1)
│  │  └─ Measure → Identify → Optimize → Verify
│  │
│  └─ NO → Optimize for readability first
│
└─ "Is this part of system architecture?"
   ├─ YES → Apply SOLID & layering (Domain 2.2-2.4)
   │  └─ Consider coupling, dependencies, reversibility
   │
   └─ NO (utility function)
      └─ Apply local principles (Domain 1)
```

---

## Prompt Templates

### Template 1: Standard Feature Development

```markdown
# Code Generation Request: [Feature Name]

## Requirements
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

## Constraints
- Must work with [existing module/system]
- Performance: [e.g., "< 100ms for 10K items"]
- Supported environments: [e.g., "Node.js 18+"]

## Coding Standards to Apply

### Code Quality (Domain 1)
- Meaningful variable/function names that reveal intent
- Single Responsibility: each function does one thing
- Maximum function size: 20 lines
- No code duplication; abstract to reusable units
- Comments explain *why*, not *what*

### Architecture (Domain 2)
- Reduce coupling: use dependency injection for external dependencies
- High cohesion: group related functionality
- Follow SOLID principles:
  - Single Responsibility: one reason to change per class
  - Open/Closed: open for extension, closed for modification
  - Liskov Substitution: derived classes are substitutable
  - Interface Segregation: depend on focused interfaces
  - Dependency Inversion: depend on abstractions, not concrete types

### Testing (Domain 3)
- 100% unit test coverage for business logic
- Write tests first (TDD: Red → Green → Refactor)
- Mocking external dependencies; isolated tests
- Clear test names revealing what's being tested

### Performance (Domain 4)
- Minimize memory allocations in loops
- Cache expensive operations
- Batch operations when possible
- Profile before optimizing

### Design (Domain 5)
- Use composition over inheritance
- Apply design patterns only for recurring problems
- Keep options open; make decisions reversible

## Deliverables
- [Implementation]
- [Test suite]
- [Documentation if needed]

## Success Criteria
- All tests pass
- Code adheres to all standards above
- [Performance targets met] (if applicable)
```

### Template 2: Optimization Request

```markdown
# Code Performance Optimization

## Current State
- Current performance: [e.g., "500ms for 10K items"]
- Bottleneck: [e.g., "Database queries"]
- Context: [e.g., "Runs 100x per request on high-traffic endpoint"]

## Constraints
- Readability must not significantly decrease
- Behavior must not change
- Must remain testable

## Optimization Approach
1. Verify current performance (provide benchmark)
2. Identify optimization opportunity
3. Implement optimization
4. Verify improvement (provide new benchmark)
5. Document why this optimization exists

## Apply Standards From
- Domain 4: Performance & Optimization
- Domain 3: Maintain test coverage
- Domain 1: Keep code clear despite optimization
```

### Template 3: Refactoring Request

```markdown
# Code Refactoring: [Module Name]

## Current Problems
- [Problem 1: e.g., "Tight coupling to database"]
- [Problem 2: e.g., "Hard to test due to global state"]
- [Problem 3: e.g., "Violates Single Responsibility"]

## Target State
- [Goal 1: e.g., "Loosely coupled; can swap implementations"]
- [Goal 2: e.g., "100% testable with mocks"]
- [Goal 3: e.g., "Each class has one responsibility"]

## Constraints
- Behavior must not change (covered by tests)
- API surface must remain compatible
- Performance must not degrade

## Apply Standards From
- Domain 2: Architecture & SOLID
- Domain 1: Code Quality
- Domain 3: Tests protect refactoring
```

---

## Anti-Patterns Registry

### Anti-Pattern 1: God Objects

**Description**: Single class doing too much; thousands of lines; multiple responsibilities.

**Symptoms**:
- Class name uses generic terms: Manager, Handler, Processor, Utility
- 500+ lines of code
- Multiple reasons to change
- Hard to test; requires setting up many mocks

**Fix**:
- Extract responsibilities into separate classes
- Apply Single Responsibility Principle
- Establish clear interfaces between classes

### Anti-Pattern 2: Primitive Obsession

**Description**: Using primitive types instead of small, focused objects.

```javascript
// ❌ Anti-pattern
function createUser(firstName, lastName, email, phone, streetAddress, city, state, zipCode) {
  // Parameters are hard to understand
  // Easy to pass in wrong order
  // Scattered throughout code
}

// ✅ Fix: Use objects
class Name {
  constructor(first, last) { }
}

class Email {
  constructor(address) {
    if (!address.includes('@')) throw new Error('Invalid email');
  }
}

class Address {
  constructor(street, city, state, zip) { }
}

function createUser(name, email, phone, address) {
  // Clear intent; Email validates format; type-safe
}
```

### Anti-Pattern 3: Long Parameter Lists

**Description**: Functions with many parameters; hard to use and understand.

```javascript
// ❌ Anti-pattern
function processOrder(orderId, customerId, items, discount, taxRate, shippingAddress, billingAddress, paymentMethod, shouldNotify, notificationEmail) {
  // Too many parameters; which are required?
  // Easy to pass in wrong order
  // Hard to add optional parameters later
}

// ✅ Fix: Use objects for related parameters
class OrderRequest {
  constructor(orderId, customerId, items, options = {}) {
    this.orderId = orderId;
    this.customerId = customerId;
    this.items = items;
    this.discount = options.discount || 0;
    this.taxRate = options.taxRate || 0.08;
    this.shippingAddress = options.shippingAddress;
    this.billingAddress = options.billingAddress;
    this.paymentMethod = options.paymentMethod;
    this.shouldNotify = options.shouldNotify ?? true;
    this.notificationEmail = options.notificationEmail;
  }
}

function processOrder(request) {
  // Clear structure; easy to extend; optional parameters explicit
}
```

### Anti-Pattern 4: Speculative Generality

**Description**: Building infrastructure for features that might be needed "someday".

```javascript
// ❌ Anti-pattern: overly generic framework for hypothetical future needs
class Repository<T> {
  async find(query) { }
  async findById(id) { }
  async findByIds(ids) { }
  async findByPattern(pattern) { }
  async findWithCaching(query) { }
  async findWithPagination(query, page, size) { }
  // ... 20 more query methods for hypothetical scenarios
}

// Used today for: just finding users by ID
const user = userRepository.findById(5);

// ✅ Fix: Build only what you need
class UserRepository {
  async findById(id) { }
  async findByEmail(email) { }
  async create(user) { }
  async update(user) { }
  async delete(id) { }
  
  // Add more methods when you actually need them
}
```

### Anti-Pattern 5: Callback Hell / Pyramid of Doom

**Description**: Deeply nested callbacks; unreadable asynchronous code.

```javascript
// ❌ Anti-pattern
fetchUser(userId, (err, user) => {
  if (err) handleError(err);
  
  fetchOrders(user.id, (err, orders) => {
    if (err) handleError(err);
    
    fetchOrderDetails(orders[0].id, (err, details) => {
      if (err) handleError(err);
      
      processOrderDetails(details, (err, result) => {
        if (err) handleError(err);
        
        sendNotification(user.email, result, (err) => {
          if (err) handleError(err);
        });
      });
    });
  });
});

// ✅ Fix: Use Promises or async/await
async function processUserOrder(userId) {
  try {
    const user = await fetchUser(userId);
    const orders = await fetchOrders(user.id);
    const details = await fetchOrderDetails(orders[0].id);
    const result = await processOrderDetails(details);
    await sendNotification(user.email, result);
  } catch (err) {
    handleError(err);
  }
}
```

### Anti-Pattern 6: Magic Numbers

**Description**: Hard-coded values with unclear meaning.

```javascript
// ❌ Anti-pattern
if (user.age > 18) { }  // What's 18? Legal age? Why?
const discount = total * 0.15;  // What's 0.15? 15% for what?
setTimeout(() => retry(), 5000);  // Why 5 seconds?

// ✅ Fix: Named constants with clear meaning
const LEGAL_AGE_THRESHOLD = 18;
const ELIGIBILITY_DISCOUNT_RATE = 0.15;  // 15% discount for eligible users per pricing policy
const RETRY_DELAY_MS = 5000;  // 5 seconds between retry attempts (tuned via performance testing)

if (user.age > LEGAL_AGE_THRESHOLD) { }
const discount = total * ELIGIBILITY_DISCOUNT_RATE;
setTimeout(() => retry(), RETRY_DELAY_MS);
```

### Anti-Pattern 7: Error Swallowing

**Description**: Catching exceptions but not handling them; silently failing.

```javascript
// ❌ Anti-pattern: error ignored
try {
  processPayment(order);
} catch (err) {
  // Silently ignores; user has no idea payment failed
}

// ✅ Fix: Handle or re-throw with context
try {
  processPayment(order);
} catch (err) {
  // Option 1: Handle it
  logger.error('Payment failed for order ${order.id}', err);
  notifyUser(order.userId, 'Payment processing failed; retrying...');
  await retryPayment(order);
  
  // Option 2: Re-throw with context
  throw new Error(`Payment failed for order ${order.id}: ${err.message}`);
  
  // Option 3: Convert to domain-specific exception
  throw new PaymentFailedException(order.id, err);
}
```

### Anti-Pattern 8: Tight Coupling to Frameworks

**Description**: Business logic dependent on specific framework; hard to test or migrate.

```javascript
// ❌ Anti-pattern: business logic tightly coupled to Express
app.get('/users/:id', (req, res, next) => {
  try {
    const user = userDatabase.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ✅ Fix: Separate business logic from framework
class UserService {
  findUserById(id) {
    const user = userDatabase.findById(id);
    if (!user) throw new UserNotFoundException(id);
    return user;
  }
}

// Framework layer (Express) orchestrates
app.get('/users/:id', (req, res, next) => {
  try {
    const user = userService.findUserById(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Now UserService is testable and framework-agnostic
```

---

## Metrics & Validation

### Checklist: Before Generating Code

- [ ] **Naming**: Are all variables, functions, classes named clearly (reveal intent)?
- [ ] **Single Responsibility**: Does each function/class have one reason to change?
- [ ] **DRY**: Is code duplicated anywhere? Can it be abstracted?
- [ ] **Testability**: Can this code be tested in isolation with mocks?
- [ ] **Coupling**: Does this depend directly on concrete types, or abstractions?
- [ ] **Size**: Functions fit on one screen? Classes not doing too much?
- [ ] **Comments**: Comments explain *why*, not *what*?

### Checklist: Testing

- [ ] **Coverage**: Core business logic has unit test coverage?
- [ ] **Isolation**: Tests use mocks for external dependencies?
- [ ] **Clear Names**: Test names clearly state what's tested?
- [ ] **Red-Green-Refactor**: Were tests written first?
- [ ] **Regression Protected**: Can code be refactored without breaking tests?

### Checklist: Performance

- [ ] **Measured**: Is performance data collected before optimization?
- [ ] **Identified**: Is the actual bottleneck identified (not guessed)?
- [ ] **Justified**: Is each optimization explained and documented?
- [ ] **Verified**: Is improvement measured after optimization?
- [ ] **Trade-offs**: Are clarity vs. speed trade-offs explicit and documented?

### Checklist: Architecture

- [ ] **Layering**: Does code follow architectural layers (if applicable)?
- [ ] **Boundaries**: Are dependencies pointing in correct direction?
- [ ] **SOLID**: Are SOLID principles being followed?
- [ ] **Reversibility**: Could major decisions be unmade without rewrite?
- [ ] **Cohesion**: Is related code grouped; unrelated code separated?

---

## Summary: The Seven Core Principles

1. **Code is for Humans**: Clarity over cleverness; names reveal intent; comments explain why.

2. **Simplicity**: "Simplest thing that works" is the starting point; complexity needs justification.

3. **Measurement Before Optimization**: Profile → Identify → Optimize → Verify. Never guess.

4. **Single Responsibility**: Each function/class has one reason to change; decompose ruthlessly.

5. **Test-Driven Development**: Write tests first (Red → Green → Refactor); tests enable fearless refactoring.

6. **Low Coupling, High Cohesion**: Modules are independent; related code stays together.

7. **Evolutionary Design**: Assume requirements change; build to accommodate change; keep decisions reversible.

---

## Continuous Improvement

As an AI coding agent, improve continuously:

1. **Gather feedback**: Track which principles prevented bugs, simplified maintenance, or accelerated development.
2. **Update guidelines**: Refine this document based on what works for your specific context.
3. **Share learnings**: Distribute improvements across teams; establish shared coding vocabulary.
4. **Measure outcomes**: Track code review feedback, bug rates, maintenance time; correlate with principles applied.
5. **Iterate**: Better guidelines lead to better code; better code leads to better feedback; iterate.

---

**End of Guidebook**

