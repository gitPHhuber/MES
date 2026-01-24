#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Собирает "ядро" проекта в один текстовый файл, начиная с директории,
из которой был запущен скрипт (текущий рабочий каталог).

Рекурсивно проходит по подкаталогам, игнорируя мусорные директории и бинарники.
Собирает:
- фронтовый код (ts/tsx/js/jsx/css/html/md/json)
- Ansible playbooks (yml/yaml)
- bash-скрипты (sh)
- Python-скрипты (py)
- Terraform (tf, tfvars)
- lock-файлы (*.lock) и cfg-конфиги (*.cfg)

Если дамп уже существует, создаёт следующий файл с версией:
project_dump_core.txt, project_dump_core_2.txt, project_dump_core_3.txt, ...
"""

from __future__ import annotations
import os
from pathlib import Path

# === Настройки под проект ===
# Проектная директория — это текущая папка, откуда запускается скрипт
PROJECT_DIR = Path.cwd().resolve()

# Базовое имя дампа (без суффикса версии)
DUMP_BASENAME_PREFIX = "project_dump_core"
DUMP_EXTENSION = ".txt"


def get_next_output_file(project_dir: Path) -> Path:
    """
    Возвращает путь к следующему файлу дампа.
    """
    base_file = project_dir / f"{DUMP_BASENAME_PREFIX}{DUMP_EXTENSION}"
    if not base_file.exists():
        return base_file

    max_version = 1  # базовый файл считаем версией 1

    # Ищем файлы вида project_dump_core_*.txt
    for p in project_dir.glob(f"{DUMP_BASENAME_PREFIX}_*{DUMP_EXTENSION}"):
        stem = p.stem
        parts = stem.split("_")
        if not parts:
            continue
        last = parts[-1]
        try:
            num = int(last)
        except ValueError:
            continue
        if num > max_version:
            max_version = num

    next_version = max_version + 1
    return project_dir / f"{DUMP_BASENAME_PREFIX}_{next_version}{DUMP_EXTENSION}"


# Какие корневые файлы нужны (точные имена)
ALLOWED_ROOT_FILES = {
    "README.md",
    "index.html",
    "package.json",
    "eslint.config.js",
    "vite.config.ts",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
}

# Разрешённые расширения исходников и скриптов
ALLOWED_EXT = {
    # фронт
    ".ts", ".tsx", ".js", ".jsx", ".css", ".md", ".json", ".html",
    # ansible / yaml
    ".yml", ".yaml",
    # bash / shell
    ".sh",
    # python
    ".py",
    # terraform
    ".tf", ".tfvars",
    # configs / locks
    ".cfg", ".lock",
}

# === Явно исключаемые директории (ОБНОВЛЕНО) ===
EXCLUDED_DIRS = {
    # Система и IDE
    ".git", ".idea", ".vscode",
    
    # Сборка и кэш (Front/General)
    "node_modules", "dist", "build", ".next", ".nuxt",
    "coverage", ".turbo", ".cache", 
    
    # PYTHON / Virtual Envs (чтобы не собирать библиотеки)
    ".venv", "venv", "env", ".env",       # Виртуальные окружения
    "__pycache__",                        # Кэш байткода
    "Lib", "site-packages", "Scripts",    # Папки внутри venv (на всякий случай)
    ".pytest_cache", ".mypy_cache",       # Кэши тестов и линтеров
    ".tox", ".eggs", "*.egg-info",        # Tox и пакеты
    
    # Terraform
    ".terraform",
}

# Явно исключаемые файлы по имени
# (убираем все package-lock.json независимо от пути)
EXCLUDED_FILES: set[str] = {
    "package-lock.json",
}

# Явно исключаемые расширения (ассеты/бинарники)
EXCLUDED_EXT = {
    ".map", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp",
    ".bmp", ".pdf", ".mp4", ".mp3", ".wav",
    ".woff", ".woff2", ".ttf", ".eot",
    ".pyc", ".pyo", ".pyd", ".whl",  # Добавил бинарники питона
}

# Конкретные мусорные файлы по относительному пути от PROJECT_DIR
UNWANTED_RELATIVE_PATHS = {
    "MES-Kryptonit-Client-main/package-lock.json",
    "MES-Kryptonit-Server-master/package-lock.json",
    "MES-Kryptonit-Client-main/README.md",  # Vite-шный шаблонный README
    "MES-Kryptonit-Client-main/src/components/Test/Test.tsx",  # пасхалка WARFACE
}

# Лимиты: обрезать очень большие исходники
MAX_FILE_SIZE_BYTES = 400_000   # если файл больше — лучше пропустить
MAX_LINES_PER_FILE  = 2000      # или обрезать до N строк (если файл очень длинный)


def is_excluded_dir(name: str) -> bool:
    return name in EXCLUDED_DIRS


def should_keep_root_file(p: Path) -> bool:
    # строго по имени
    return p.name in ALLOWED_ROOT_FILES


def is_dump_file(path: Path) -> bool:
    """
    Проверяет, является ли файл одним из дампов:
    project_dump_core*.txt
    """
    return (
        path.suffix == DUMP_EXTENSION
        and path.stem.startswith(DUMP_BASENAME_PREFIX)
    )


def should_keep(path: Path) -> bool:
    """
    Общая логика отбора файлов
    """
    # Не включаем в дамп файлы дампов
    if is_dump_file(path):
        return False

    # Конкретные мусорные файлы по относительному пути
    try:
        rel = path.relative_to(PROJECT_DIR).as_posix()
    except ValueError:
        rel = path.as_posix()

    if rel in UNWANTED_RELATIVE_PATHS:
        return False

    # Общие исключения
    if any(part in EXCLUDED_DIRS for part in path.parts):
        return False
    if path.name in EXCLUDED_FILES:
        return False
    if path.suffix.lower() in EXCLUDED_EXT:
        return False

    # Корневые нужные файлы — даже если расширение вне ALLOWED_EXT
    if path.parent == PROJECT_DIR and should_keep_root_file(path):
        return True

    # Обычные исходники/скрипты/плейбуки/конфиги по расширению
    if path.suffix.lower() in ALLOWED_EXT:
        return True

    return False


def gather_files() -> list[Path]:
    files: list[Path] = []
    for root, dirs, filenames in os.walk(PROJECT_DIR):
        # на лету выкидываем исключённые каталоги
        dirs[:] = [d for d in dirs if not is_excluded_dir(d)]
        for fn in filenames:
            p = Path(root) / fn
            if not p.is_file():
                continue
            if should_keep(p):
                files.append(p)
    # упорядочим по относительному пути
    return sorted(files, key=lambda x: x.relative_to(PROJECT_DIR).as_posix())


def read_file_safely(p: Path) -> tuple[str, bool]:
    """
    Возвращает (content, truncated_flag).
    Обрезает по размеру или по числу строк, чтобы не раздувать дамп.
    """
    truncated = False
    try:
        size = p.stat().st_size
        if size > MAX_FILE_SIZE_BYTES:
            return (
                f"[Пропущено: файл {size} байт больше лимита {MAX_FILE_SIZE_BYTES}]\n",
                True,
            )

        with p.open("r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        if len(lines) > MAX_LINES_PER_FILE:
            truncated = True
            lines = lines[:MAX_LINES_PER_FILE]
            lines.append(f"\n[... обрезано до {MAX_LINES_PER_FILE} строк ...]\n")

        return "".join(lines), truncated
    except Exception as e:
        return f"[Ошибка чтения файла: {e}]\n", True


def main():
    print(f"Стартую сборку из каталога: {PROJECT_DIR}")

    output_file = get_next_output_file(PROJECT_DIR)
    print(f"Файл дампа: {output_file.name}")

    files = gather_files()

    # Оглавление
    toc_lines = ["PROJECT CORE FILES OVERVIEW\n", "=" * 80 + "\n"]
    for f in files:
        toc_lines.append(f"- {f.relative_to(PROJECT_DIR).as_posix()}\n")
    toc_lines.append("\n\n")

    with output_file.open("w", encoding="utf-8") as out:
        out.writelines(toc_lines)

        for f in files:
            rel = f.relative_to(PROJECT_DIR).as_posix()
            out.write("=" * 80 + "\n")
            out.write(f"FILE: {rel}\n")
            out.write("=" * 80 + "\n\n")

            content, truncated = read_file_safely(f)
            out.write(content)
            out.write("\n")

    print(f"Готово: {output_file}")
    print(f"Файлов собрано: {len(files)}")


if __name__ == "__main__":
    main()
