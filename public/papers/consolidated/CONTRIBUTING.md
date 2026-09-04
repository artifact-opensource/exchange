# Contributing to Research Project

Thank you for your interest in contributing to this advanced AI research project! This document provides guidelines for contributing to the repository.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- Python 3.8 or higher
- Node.js 18.x or higher
- Docker and Docker Compose (for containerized services)
- Git

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/amuzetnoM/research.git
   cd research
   ```

2. **Set up Python environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r setup/requirements.txt
   pip install -r head_1/system/requirements.txt
   ```

3. **Install development dependencies:**
   ```bash
   pip install pytest pytest-cov ruff mypy bandit black pre-commit
   ```

4. **Set up pre-commit hooks:**
   ```bash
   pre-commit install
   ```

5. **Install Node.js dependencies:**
   ```bash
   npm install
   cd frontend && npm install
   ```

6. **Set up Docker services (optional):**
   ```bash
   cd head_1/monitoring
   docker-compose up -d
   ```

## How to Contribute

### Reporting Bugs

- Use the GitHub issue tracker
- Check if the bug has already been reported
- Include detailed information:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - System information
  - Error logs

### Suggesting Enhancements

- Use the GitHub issue tracker
- Clearly describe the enhancement
- Explain why it would be useful
- Provide examples if applicable

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Write or update tests**
5. **Ensure all tests pass:**
   ```bash
   pytest
   npm test
   ```
6. **Commit your changes:**
   ```bash
   git commit -m "feat: add new feature"
   ```
7. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Create a Pull Request**

## Coding Standards

### Python

- Follow [PEP 8](https://pep8.org/) style guide
- Use [ruff](https://docs.astral.sh/ruff/) for linting and formatting
- Use type hints where appropriate
- Write docstrings for all public functions, classes, and modules
- Maximum line length: 100 characters

Example:
```python
def process_data(input_data: dict[str, Any]) -> dict[str, Any]:
    """Process input data and return results.
    
    Args:
        input_data: Dictionary containing input parameters
        
    Returns:
        Dictionary containing processed results
        
    Raises:
        ValueError: If input_data is invalid
    """
    # Implementation
    pass
```

### TypeScript/JavaScript

- Follow the project's ESLint configuration
- Use TypeScript for all new code
- Use meaningful variable and function names
- Write JSDoc comments for complex functions

Example:
```typescript
/**
 * Fetches data from the monitoring service
 * @param endpoint - API endpoint to query
 * @returns Promise containing the response data
 */
async function fetchMonitoringData(endpoint: string): Promise<MonitoringData> {
  // Implementation
}
```

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example: `feat: add real-time monitoring dashboard`

## Testing

### Python Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov

# Run specific test file
pytest tests/test_specific.py

# Run tests by marker
pytest -m unit
pytest -m integration
```

### JavaScript/TypeScript Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Writing Tests

- Write tests for all new features
- Maintain or improve code coverage
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern

## Pull Request Process

1. **Update documentation** if you've made changes to:
   - APIs
   - Configuration
   - Installation process
   - Usage examples

2. **Update the README.md** if needed

3. **Ensure CI passes:**
   - All tests pass
   - Linting passes
   - Security checks pass

4. **Request review** from maintainers

5. **Address review comments**

6. **Squash commits** if requested

7. **Wait for approval** before merging

## Project Structure

```
research/
├── head_1/              # Main AI frameworks and systems
│   ├── frameworks/      # AI frameworks (self-awareness, ethics, etc.)
│   ├── models/          # AI models
│   ├── monitoring/      # Monitoring and diagnostics
│   └── system/          # System utilities
├── frontend/            # Next.js frontend application
├── _cnu/               # Core neurological state manager
├── dataService/        # Data service abstraction layer
├── inference_api/      # Inference API
├── .github/            # GitHub workflows and configurations
└── docs/               # Documentation

```

## Areas for Contribution

We welcome contributions in the following areas:

1. **Framework Development:**
   - Enhancing existing AI frameworks
   - Adding new capabilities to self-awareness mechanics
   - Improving ethical reasoning systems

2. **Testing:**
   - Writing unit tests
   - Writing integration tests
   - Improving test coverage

3. **Documentation:**
   - API documentation
   - Usage examples
   - Tutorials
   - Architecture documentation

4. **Monitoring & Diagnostics:**
   - Performance improvements
   - New metrics
   - Dashboard enhancements

5. **Security:**
   - Security audits
   - Vulnerability fixes
   - Authentication improvements

6. **Infrastructure:**
   - Docker optimization
   - CI/CD improvements
   - Deployment automation

## Questions?

If you have questions, please:

1. Check existing documentation
2. Search existing issues
3. Create a new issue with the "question" label
4. Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

## Acknowledgments

Thank you for contributing to advancing AI research!
