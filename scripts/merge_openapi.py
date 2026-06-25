"""
merge_openapi.py
────────────────────────────────────────────────
API Gateway からエクスポートした openapi.yaml と
手書きの openapi-overlay.yaml をマージして
最終的な openapi-merged.yaml を生成する。

マージ戦略:
  - info, servers      : overlay で上書き
  - paths              : export のルート構造を維持しつつ
                         overlay の summary/description/tags/
                         requestBody/responses/security を深くマージ
  - components         : overlay の定義を追加
"""

import sys
import yaml


def deep_merge(base: dict, override: dict) -> dict:
    result = dict(base)
    for key, val in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(val, dict):
            result[key] = deep_merge(result[key], val)
        else:
            result[key] = val
    return result


def merge(export_path: str, overlay_path: str, output_path: str) -> None:
    with open(export_path) as f:
        exported = yaml.safe_load(f)

    with open(overlay_path) as f:
        overlay = yaml.safe_load(f)

    merged = dict(exported)

    # info / servers を overlay で上書き
    for key in ("info", "servers"):
        if key in overlay:
            merged[key] = overlay[key]

    # components を追加（export 側に components がなくても動作する）
    if "components" in overlay:
        merged["components"] = deep_merge(
            merged.get("components", {}),
            overlay["components"],
        )

    # paths をマージ（export のルート構造 + overlay のスキーマ）
    overlay_paths = overlay.get("paths", {})
    merged_paths = dict(merged.get("paths", {}))

    for path, methods in overlay_paths.items():
        if path not in merged_paths:
            # export にないパスは overlay をそのまま追加
            merged_paths[path] = methods
            continue

        for method, op in methods.items():
            if method not in merged_paths[path]:
                merged_paths[path][method] = op
            else:
                merged_paths[path][method] = deep_merge(
                    merged_paths[path][method], op
                )

    merged["paths"] = merged_paths

    with open(output_path, "w") as f:
        yaml.dump(merged, f, allow_unicode=True, sort_keys=False)

    print(f"Merged OpenAPI written to: {output_path}")


if __name__ == "__main__":
    export_path  = sys.argv[1] if len(sys.argv) > 1 else "openapi.yaml"
    overlay_path = sys.argv[2] if len(sys.argv) > 2 else "docs/openapi-overlay.yaml"
    output_path  = sys.argv[3] if len(sys.argv) > 3 else "openapi-merged.yaml"
    merge(export_path, overlay_path, output_path)
