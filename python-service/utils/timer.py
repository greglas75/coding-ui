"""Performance timing utilities."""

import time
from typing import Dict, List
from contextlib import contextmanager

class PerformanceTimer:
    """
    Track performance of validation tiers.

    Usage:
        timer = PerformanceTimer()
        with timer.measure("tier_0_pinecone"):
            # do work

        print(timer.get_summary())
    """

    def __init__(self):
        self.timings: Dict[str, List[float]] = {}

    @contextmanager
    def measure(self, operation: str):
        """Context manager to measure operation time."""
        start = time.time()
        try:
            yield
        finally:
            elapsed = (time.time() - start) * 1000  # milliseconds
            if operation not in self.timings:
                self.timings[operation] = []
            self.timings[operation].append(elapsed)

    def get_summary(self) -> dict:
        """Get timing summary."""
        total = sum(sum(times) for times in self.timings.values())

        return {
            "total_ms": round(total, 2),
            "total_seconds": round(total / 1000, 2),
            "breakdown": {
                operation: {
                    "time_ms": round(sum(times), 2),
                    "time_seconds": round(sum(times) / 1000, 2),
                    "calls": len(times),
                    "avg_ms": round(sum(times) / len(times), 2),
                    "percentage": round((sum(times) / total) * 100, 1)
                }
                for operation, times in self.timings.items()
            }
        }

    def print_summary(self):
        """Print formatted timing summary."""
        summary = self.get_summary()

        print("\n" + "="*60)
        print("⏱️  VALIDATION PERFORMANCE SUMMARY")
        print("="*60)
        print(f"\n🕐 Total Time: {summary['total_seconds']}s ({summary['total_ms']}ms)\n")
        print("Breakdown by Tier:")
        print("-" * 60)

        for operation, stats in sorted(
            summary['breakdown'].items(),
            key=lambda x: x[1]['time_ms'],
            reverse=True
        ):
            bar_length = int((stats['percentage'] / 100) * 40)
            bar = "█" * bar_length + "░" * (40 - bar_length)

            print(f"{operation:30s} [{bar}] {stats['time_ms']:6.0f}ms ({stats['percentage']:4.1f}%)")

        print("="*60 + "\n")
