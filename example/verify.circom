pragma circom 2.0.0;

include "circomlib/comparators.circom";
include "circomlib/bitify.circom";

template AverageLengthCalculation(max_entries) {
    // Public inputs
    signal input num_entries;
    signal input claimed_average;

    // Private inputs
    signal input entry_lengths[max_entries];

    // Intermediate signals
    signal total_length;

    // Constraints
    num_entries <= max_entries;

    // Calculate total length
    total_length <== sum(entry_lengths);

    // Verify average calculation
    claimed_average * num_entries === total_length;

    // Helper function to sum array elements
    function sum(arr) {
        var s = 0;
        for (var i = 0; i < max_entries; i++) {
            s += arr[i];
        }
        return s;
    }
}