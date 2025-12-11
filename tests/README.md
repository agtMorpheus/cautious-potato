# Testing Guide

## PHP Tests with PHPUnit

### Setup Complete ✅

- Composer installed
- PHPUnit 9.6.31 installed
- Autoloader configured
- Bootstrap file updated

### Running Tests

```bash
# Run all tests
composer test

# Run tests with verbose output
composer run test:verbose

# Run specific test file
./vendor/bin/phpunit tests/php/AuthTest.php

# Run tests with coverage report
composer run test:coverage

# Stop on first failure
composer test -- --stop-on-failure

# Filter tests by name
./vendor/bin/phpunit --filter testValidateStringField
```

### Test Structure

- **Unit Tests**: `tests/php/` - Individual class/function tests
- **Integration Tests**: `tests/integration/` - API endpoint tests
- **Visual Tests**: `tests/visual/` - Frontend component tests

### Current Status

- 314 tests discovered
- Some tests failing due to missing database tables
- Deprecation warnings in WorkflowEngine.php need fixing

### Next Steps

1. Fix database connection issues for integration tests
2. Address PHP 8.5 deprecation warnings
3. Update validation rules tests
4. Set up test database environment