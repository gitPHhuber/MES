#!/usr/bin/env python3
"""
Скрипт для удаления комментариев из JavaScript/TypeScript файлов.

Корректно обрабатывает:
- Строки (одинарные, двойные кавычки, backticks)
- Template literals с вложенными выражениями ${...}
- Regex literals /pattern/flags
- Triple-slash директивы TypeScript (/// <reference ...>)
- JSX комментарии {/* ... */} — удаляет вместе с фигурными скобками
"""

import os
import re
import argparse
from pathlib import Path
from enum import Enum, auto
from typing import Optional


class State(Enum):
    CODE = auto()
    STRING_SINGLE = auto()
    STRING_DOUBLE = auto()
    TEMPLATE_STRING = auto()
    TEMPLATE_EXPR = auto()
    REGEX = auto()
    LINE_COMMENT = auto()
    BLOCK_COMMENT = auto()


class CommentRemover:
    """State-machine парсер для удаления комментариев из JS/TS."""
    
    # Токены после которых `/` начинает regex, а не деление
    REGEX_PREV_TOKENS = {
        '(', '[', '{', '}', ',', ';', ':', '=', '!', '&', '|', '?', 
        '~', '^', '<', '>', '+', '-', '*', '%', '\n', '\r'
    }
    
    # Ключевые слова после которых может идти regex
    REGEX_KEYWORDS = {
        'return', 'case', 'throw', 'in', 'instanceof', 'typeof', 
        'void', 'delete', 'new', 'else', 'do', 'yield', 'await'
    }
    
    def __init__(self, content: str):
        self.content = content
        self.length = len(content)
        self.pos = 0
        self.result: list[str] = []
        self.state = State.CODE
        self.template_depth = 0  # Глубина вложенности ${...} в template strings
        self.brace_stack: list[int] = []  # Стек для отслеживания {} внутри ${}
        self.last_significant_char = '\n'  # Для определения regex vs division
        self.last_significant_word = ''  # Для ключевых слов перед regex
        
    def peek(self, offset: int = 0) -> str:
        """Посмотреть символ без продвижения позиции."""
        idx = self.pos + offset
        return self.content[idx] if idx < self.length else ''
    
    def peek_str(self, length: int) -> str:
        """Посмотреть несколько символов."""
        return self.content[self.pos:self.pos + length]
    
    def advance(self, count: int = 1) -> str:
        """Продвинуться на count символов, вернуть их."""
        result = self.content[self.pos:self.pos + count]
        self.pos += count
        return result
    
    def skip_until(self, end: str) -> str:
        """Пропустить символы до end (не включая), вернуть пропущенное."""
        start = self.pos
        while self.pos < self.length and self.content[self.pos:self.pos + len(end)] != end:
            self.pos += 1
        return self.content[start:self.pos]
    
    def update_last_significant(self, char: str):
        """Обновить последний значимый символ/слово для определения regex."""
        if char.isalnum() or char == '_':
            self.last_significant_word += char
        else:
            if not char.isspace():
                self.last_significant_char = char
                self.last_significant_word = ''
    
    def can_start_regex(self) -> bool:
        """Может ли здесь начинаться regex literal?"""
        # После определённых символов
        if self.last_significant_char in self.REGEX_PREV_TOKENS:
            return True
        # После ключевых слов
        if self.last_significant_word in self.REGEX_KEYWORDS:
            return True
        return False
    
    def is_triple_slash_directive(self) -> bool:
        """Проверить, является ли это TypeScript triple-slash директивой."""
        if self.peek_str(3) != '///':
            return False
        # Ищем <reference или <amd-module и т.д.
        rest_of_line = ''
        i = self.pos + 3
        while i < self.length and self.content[i] != '\n':
            rest_of_line += self.content[i]
            i += 1
        rest_stripped = rest_of_line.strip()
        return rest_stripped.startswith('<') and ('reference' in rest_stripped or 
                                                   'amd-module' in rest_stripped or
                                                   'amd-dependency' in rest_stripped)
    
    def is_jsx_comment_start(self) -> bool:
        """Проверить, является ли это началом JSX комментария {/* """
        # Смотрим назад — был ли `{` перед `/*`
        # Ищем последний непробельный символ перед текущей позицией
        i = self.pos - 1
        while i >= 0 and self.content[i] in ' \t':
            i -= 1
        return i >= 0 and self.content[i] == '{'
    
    def remove_trailing_jsx_brace(self):
        """Удалить `{` который был добавлен перед JSX комментарием."""
        # Убираем trailing whitespace и `{`
        while self.result and self.result[-1] in ' \t':
            self.result.pop()
        if self.result and self.result[-1] == '{':
            self.result.pop()
            # Убираем пробелы перед `{` тоже
            while self.result and self.result[-1] in ' \t':
                self.result.pop()
    
    def process_string(self, quote: str) -> None:
        """Обработать строку в одинарных или двойных кавычках."""
        self.result.append(self.advance())  # Открывающая кавычка
        
        while self.pos < self.length:
            char = self.peek()
            
            if char == '\\' and self.pos + 1 < self.length:
                # Экранированный символ
                self.result.append(self.advance(2))
            elif char == quote:
                # Закрывающая кавычка
                self.result.append(self.advance())
                return
            elif char == '\n':
                # Незакрытая строка (ошибка синтаксиса, но не ломаем файл)
                self.result.append(self.advance())
                return
            else:
                self.result.append(self.advance())
    
    def process_template_string(self) -> None:
        """Обработать template literal с поддержкой вложенных ${...}."""
        self.result.append(self.advance())  # Открывающий backtick
        
        while self.pos < self.length:
            char = self.peek()
            
            if char == '\\' and self.pos + 1 < self.length:
                self.result.append(self.advance(2))
            elif char == '`':
                self.result.append(self.advance())
                return
            elif self.peek_str(2) == '${':
                # Начало выражения внутри template
                self.result.append(self.advance(2))  # ${
                self.process_template_expression()
            else:
                self.result.append(self.advance())
    
    def process_template_expression(self) -> None:
        """Обработать выражение ${...} внутри template literal."""
        brace_depth = 1
        
        while self.pos < self.length and brace_depth > 0:
            char = self.peek()
            
            if char == '{':
                brace_depth += 1
                self.result.append(self.advance())
            elif char == '}':
                brace_depth -= 1
                self.result.append(self.advance())
            elif char == '"':
                self.process_string('"')
            elif char == "'":
                self.process_string("'")
            elif char == '`':
                # Вложенный template literal
                self.process_template_string()
            elif self.peek_str(2) == '//':
                # Однострочный комментарий внутри выражения — удаляем
                self.skip_line_comment()
            elif self.peek_str(2) == '/*':
                # Блочный комментарий внутри выражения — удаляем
                self.skip_block_comment()
            elif char == '/':
                # Возможно regex внутри выражения
                if self.can_start_regex():
                    self.process_regex()
                else:
                    self.result.append(self.advance())
                    self.update_last_significant(char)
            else:
                self.result.append(self.advance())
                self.update_last_significant(char)
    
    def process_regex(self) -> None:
        """Обработать regex literal /pattern/flags."""
        self.result.append(self.advance())  # Открывающий /
        
        in_class = False  # Внутри character class [...]
        
        while self.pos < self.length:
            char = self.peek()
            
            if char == '\\' and self.pos + 1 < self.length:
                # Экранированный символ
                self.result.append(self.advance(2))
            elif char == '[' and not in_class:
                in_class = True
                self.result.append(self.advance())
            elif char == ']' and in_class:
                in_class = False
                self.result.append(self.advance())
            elif char == '/' and not in_class:
                # Закрывающий /
                self.result.append(self.advance())
                # Читаем флаги (gimsuy)
                while self.pos < self.length and self.peek().isalpha():
                    self.result.append(self.advance())
                return
            elif char == '\n':
                # Незакрытый regex (ошибка синтаксиса)
                return
            else:
                self.result.append(self.advance())
    
    def skip_line_comment(self) -> None:
        """Пропустить однострочный комментарий, сохранив перенос строки."""
        self.advance(2)  # //
        while self.pos < self.length and self.peek() != '\n':
            self.advance()
        # Перенос строки сохраняем
        if self.pos < self.length:
            self.result.append(self.advance())
    
    def skip_block_comment(self, is_jsx: bool = False) -> int:
        """Пропустить блочный комментарий, вернуть количество переносов строк."""
        self.advance(2)  # /*
        newlines = 0
        
        while self.pos < self.length:
            if self.peek_str(2) == '*/':
                self.advance(2)
                break
            if self.peek() == '\n':
                newlines += 1
            self.advance()
        
        # Для JSX комментария проверяем, есть ли `}` после `*/`
        if is_jsx:
            # Пропускаем пробелы
            while self.pos < self.length and self.peek() in ' \t':
                self.advance()
            # Если есть `}`, пропускаем его тоже
            if self.peek() == '}':
                self.advance()
        
        return newlines
    
    def process(self) -> str:
        """Основной цикл обработки."""
        while self.pos < self.length:
            char = self.peek()
            two_chars = self.peek_str(2)
            
            # Строки
            if char == '"':
                self.process_string('"')
                self.last_significant_char = '"'
                continue
                
            if char == "'":
                self.process_string("'")
                self.last_significant_char = "'"
                continue
            
            # Template literals
            if char == '`':
                self.process_template_string()
                self.last_significant_char = '`'
                continue
            
            # Triple-slash директивы TypeScript — сохраняем
            if self.is_triple_slash_directive():
                while self.pos < self.length and self.peek() != '\n':
                    self.result.append(self.advance())
                if self.pos < self.length:
                    self.result.append(self.advance())  # \n
                continue
            
            # Однострочные комментарии
            if two_chars == '//':
                self.skip_line_comment()
                self.last_significant_char = '\n'
                continue
            
            # Блочные комментарии (включая JSX)
            if two_chars == '/*':
                is_jsx = self.is_jsx_comment_start()
                if is_jsx:
                    self.remove_trailing_jsx_brace()
                newlines = self.skip_block_comment(is_jsx=is_jsx)
                # Сохраняем структуру файла
                self.result.append('\n' * newlines)
                continue
            
            # Возможный regex
            if char == '/':
                if self.can_start_regex():
                    # Проверяем, что это не просто деление
                    # Regex должен содержать что-то до закрывающего /
                    next_char = self.peek(1)
                    if next_char not in ('=', '/', '*', ' ', '\t', '\n', ''):
                        self.process_regex()
                        self.last_significant_char = '/'
                        continue
                
                # Обычное деление
                self.result.append(self.advance())
                self.update_last_significant('/')
                continue
            
            # Обычный символ
            self.result.append(self.advance())
            self.update_last_significant(char)
        
        return ''.join(self.result)


def remove_comments(content: str) -> str:
    """Удалить комментарии из JS/TS кода."""
    remover = CommentRemover(content)
    return remover.process()


def clean_empty_lines(content: str) -> str:
    """Убрать лишние пустые строки (более 2 подряд → 2)."""
    lines = content.split('\n')
    cleaned = []
    empty_count = 0
    
    for line in lines:
        if line.strip() == '':
            empty_count += 1
            if empty_count <= 2:
                cleaned.append(line)
        else:
            empty_count = 0
            cleaned.append(line)
    
    return '\n'.join(cleaned)


def process_file(filepath: Path, dry_run: bool = False, verbose: bool = True) -> tuple[bool, int]:
    """Обработать один файл. Возвращает (изменён, количество_удалённых_символов)."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()
    except UnicodeDecodeError:
        if verbose:
            print(f"  ⚠️  Пропуск (не UTF-8): {filepath}")
        return False, 0
    except Exception as e:
        if verbose:
            print(f"  ❌ Ошибка чтения {filepath}: {e}")
        return False, 0
    
    # Удаляем комментарии
    cleaned = remove_comments(original)
    
    # Чистим лишние пустые строки
    cleaned = clean_empty_lines(cleaned)
    
    # Убираем trailing whitespace
    cleaned = '\n'.join(line.rstrip() for line in cleaned.split('\n'))
    
    # Убираем пустые строки в конце файла
    cleaned = cleaned.rstrip() + '\n' if cleaned.strip() else ''
    
    diff = len(original) - len(cleaned)
    
    if diff > 0:
        if not dry_run:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(cleaned)
        return True, diff
    
    return False, 0


def find_code_files(root_dir: Path, extensions: set[str]) -> list[Path]:
    """Рекурсивно найти все файлы с указанными расширениями."""
    files = []
    
    skip_dirs = {
        'node_modules', '.git', 'dist', 'build', '.next',
        '__pycache__', '.vscode', '.idea', 'coverage'
    }
    
    for root, dirs, filenames in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        for filename in filenames:
            ext = Path(filename).suffix.lower()
            if ext in extensions:
                files.append(Path(root) / filename)
    
    return files


def main():
    parser = argparse.ArgumentParser(
        description='Удаление комментариев из JS/TS файлов (v2 — с поддержкой regex, template literals, triple-slash)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры:
  python remove_comments_v2.py ./src                    # Обработать папку
  python remove_comments_v2.py ./src --dry-run          # Только показать
  python remove_comments_v2.py ./src/App.tsx            # Один файл
  python remove_comments_v2.py ./src --ext .ts .tsx     # Только TS
        """
    )
    
    parser.add_argument('path', type=str, help='Путь к файлу или директории')
    parser.add_argument('--dry-run', '-d', action='store_true',
                        help='Не изменять файлы, только показать')
    parser.add_argument('--quiet', '-q', action='store_true',
                        help='Минимальный вывод')
    parser.add_argument('--ext', nargs='+', 
                        default=['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
                        help='Расширения файлов')
    
    args = parser.parse_args()
    
    target = Path(args.path)
    extensions = set(args.ext)
    verbose = not args.quiet
    
    if not target.exists():
        print(f"❌ Путь не существует: {target}")
        return 1
    
    if target.is_file():
        files = [target]
    else:
        files = find_code_files(target, extensions)
    
    if not files:
        print(f"⚠️  Файлы с расширениями {extensions} не найдены")
        return 0
    
    if verbose:
        mode = "🔍 DRY-RUN" if args.dry_run else "🔧 РЕДАКТИРОВАНИЕ"
        print(f"\n{mode}")
        print(f"📁 Путь: {target}")
        print(f"📄 Файлов: {len(files)}")
        print("-" * 50)
    
    modified_count = 0
    total_saved = 0
    
    for filepath in sorted(files):
        changed, saved = process_file(filepath, dry_run=args.dry_run, verbose=verbose)
        if changed:
            modified_count += 1
            total_saved += saved
            if verbose:
                rel = filepath.relative_to(target) if target.is_dir() else filepath.name
                print(f"  ✅ {rel} (-{saved} байт)")
    
    if verbose:
        print("-" * 50)
        print(f"📊 Изменено: {modified_count} файл(ов)")
        print(f"💾 Сэкономлено: {total_saved:,} байт")
    
    return 0


if __name__ == '__main__':
    exit(main())
