from collections import defaultdict
import sys


def main() -> None:
    data = input("Input : ").strip()
    words = data.split()

    if not words:
        print("")
        return

    counts: defaultdict[str, int] = defaultdict(int)
    first_seen: dict[str, int] = {}
    best_word = ""
    best_count = -1
    best_index = len(words)

    for idx, word in enumerate(words):
        normalized = word.lower()
        counts[normalized] += 1
        if normalized not in first_seen:
            first_seen[normalized] = idx

        freq = counts[normalized]
        pos = first_seen[normalized]
        if freq > best_count or (freq == best_count and pos < best_index):
            best_word = normalized
            best_count = freq
            best_index = pos

    print("Output : "+best_word)


if __name__ == "__main__":
    main()
