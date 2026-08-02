import json
import re
from pathlib import Path


def extract_seeds(path: Path) -> dict[str, list[dict[str, str]]]:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"const builtinStationSeedsByLineId[^=]*=\s*(\{)", text)
    if not match:
        raise SystemExit(f"no seeds in {path}")
    start = match.start(1)
    depth = 0
    end = None
    for index in range(start, len(text)):
        char = text[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                end = index + 1
                break
    if end is None:
        raise SystemExit(f"unbalanced braces in {path}")

    obj_src = text[start:end]
    data: dict[str, list[dict[str, str]]] = {}
    line_blocks = re.finditer(
        r"'(?P<id>[^']+)':\s*\[(?P<body>.*?)\],?\n\s*(?='|\})",
        obj_src,
        re.S,
    )
    for block in line_blocks:
        line_id = block.group("id")
        body = block.group("body")
        stations: list[dict[str, str]] = []
        for station_match in re.finditer(
            r"\{\s*chName:\s*'(?P<ch>(?:\\'|[^'])*)'\s*,\s*enName:\s*'(?P<en>(?:\\'|[^'])*)'\s*\}",
            body,
        ):
            stations.append(
                {
                    "chName": station_match.group("ch").replace("\\'", "'"),
                    "enName": station_match.group("en").replace("\\'", "'"),
                }
            )
        data[line_id] = stations
        print(path.name, line_id, len(stations))
    return data


def main() -> None:
    out_dir = Path("src/data")
    out_dir.mkdir(exist_ok=True)
    jobs = [
        (Path("src/builtinOpenedLineStations.ts"), out_dir / "builtin-opened-stations.json"),
        (Path("src/builtinJianbanLineStations.ts"), out_dir / "builtin-jianban-stations.json"),
    ]
    for src, dst in jobs:
        data = extract_seeds(src)
        dst.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("wrote", dst, "stations", sum(len(v) for v in data.values()), "lines", len(data))


if __name__ == "__main__":
    main()
