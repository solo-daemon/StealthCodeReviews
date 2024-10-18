pragma circom 2.1.4;

// Template to check for common security patterns
template SecurityCheck() {
    // Input signals
    signal input nullChecksCount;
    signal input boundaryChecksCount;
    signal input inputValidationCount;
    signal input unprotectedFunctionCount;
    signal input reentrancyGuardsCount;
    
    // Expected minimum counts
    signal input expectedNullChecks;
    signal input expectedBoundaryChecks;
    signal input expectedInputValidations;
    signal input maxUnprotectedFunctions;
    signal input expectedReentrancyGuards;
    
    // Output signals
    signal output securityScore;
    signal output passed;

    // Compute security score (0-100)
    var score = 0;
    
    // Null checks (worth 20 points)
    if (nullChecksCount >= expectedNullChecks) {
        score += 20;
    }
    
    // Boundary checks (worth 20 points)
    if (boundaryChecksCount >= expectedBoundaryChecks) {
        score += 20;
    }
    
    // Input validation (worth 20 points)
    if (inputValidationCount >= expectedInputValidations) {
        score += 20;
    }
    
    // Unprotected functions (worth 20 points)
    if (unprotectedFunctionCount <= maxUnprotectedFunctions) {
        score += 20;
    }
    
    // Reentrancy guards (worth 20 points)
    if (reentrancyGuardsCount >= expectedReen