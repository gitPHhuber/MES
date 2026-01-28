#!/bin/bash
# =============================================================================
# MES Kryptonit PWA - Скрипт развёртывания
# =============================================================================
#
# Использование:
#   ./deploy.sh [environment]
#
# Environments:
#   production  - Полное развёртывание с Nginx
#   staging     - Только сборка и копирование файлов
#   local       - Локальная сборка для тестирования
#
# =============================================================================

set -e  # Выход при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
APP_NAME="MES Kryptonit PWA"
VERSION="2.0.0"
BUILD_DIR="./dist"
DEPLOY_DIR="/var/www/mes-pwa"
NGINX_CONF_SRC="./nginx/mes-pwa-gateway.conf"
NGINX_CONF_DST="/etc/nginx/sites-available/mes-pwa-gateway.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/mes-pwa-gateway.conf"

# Определение окружения
ENVIRONMENT=${1:-production}

# =============================================================================
# Функции
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║            $APP_NAME v$VERSION                  ║"
    echo "║                  Deployment Script                         ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    log_info "Environment: $ENVIRONMENT"
    echo ""
}

check_requirements() {
    log_info "Проверка требований..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js не установлен!"
        exit 1
    fi
    log_success "Node.js: $(node -v)"
    
    # npm
    if ! command -v npm &> /dev/null; then
        log_error "npm не установлен!"
        exit 1
    fi
    log_success "npm: $(npm -v)"
    
    # Nginx (для production)
    if [ "$ENVIRONMENT" = "production" ]; then
        if ! command -v nginx &> /dev/null; then
            log_warning "Nginx не установлен. Пропускаем настройку веб-сервера."
        else
            log_success "Nginx: $(nginx -v 2>&1 | head -1)"
        fi
    fi
}

install_dependencies() {
    log_info "Установка зависимостей..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    log_success "Зависимости установлены"
}

build_app() {
    log_info "Сборка приложения..."
    
    # Очистка предыдущей сборки
    rm -rf "$BUILD_DIR"
    
    # Сборка
    npm run build
    
    # Проверка результата
    if [ ! -d "$BUILD_DIR" ]; then
        log_error "Сборка не удалась - папка dist не создана"
        exit 1
    fi
    
    log_success "Сборка завершена: $BUILD_DIR"
    log_info "Размер сборки: $(du -sh $BUILD_DIR | cut -f1)"
}

deploy_files() {
    log_info "Развёртывание файлов..."
    
    # Создание директории
    sudo mkdir -p "$DEPLOY_DIR"
    
    # Очистка старых файлов
    sudo rm -rf "${DEPLOY_DIR:?}"/*
    
    # Копирование новых файлов
    sudo cp -r "$BUILD_DIR"/* "$DEPLOY_DIR/"
    
    # Установка владельца
    sudo chown -R www-data:www-data "$DEPLOY_DIR"
    
    # Установка прав
    sudo chmod -R 755 "$DEPLOY_DIR"
    
    log_success "Файлы развёрнуты в $DEPLOY_DIR"
}

configure_nginx() {
    log_info "Настройка Nginx..."
    
    if ! command -v nginx &> /dev/null; then
        log_warning "Nginx не установлен, пропускаем"
        return
    fi
    
    # Проверка наличия конфига
    if [ ! -f "$NGINX_CONF_SRC" ]; then
        log_warning "Конфиг Nginx не найден: $NGINX_CONF_SRC"
        return
    fi
    
    # Копирование конфига
    sudo cp "$NGINX_CONF_SRC" "$NGINX_CONF_DST"
    
    # Создание symlink если не существует
    if [ ! -L "$NGINX_ENABLED" ]; then
        sudo ln -s "$NGINX_CONF_DST" "$NGINX_ENABLED"
    fi
    
    # Проверка конфигурации
    log_info "Проверка конфигурации Nginx..."
    if sudo nginx -t; then
        log_success "Конфигурация Nginx валидна"
        
        # Перезагрузка Nginx
        sudo systemctl reload nginx
        log_success "Nginx перезагружен"
    else
        log_error "Ошибка в конфигурации Nginx!"
        exit 1
    fi
}

print_summary() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                    Развёртывание завершено                  ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    log_success "PWA успешно развёрнут!"
    echo ""
    echo "📱 Доступ к приложению:"
    echo ""
    echo "   Основная сеть (10.11.0.x):"
    echo "   → http://10.11.0.16:3000"
    echo ""
    echo "   WiFi сеть (192.168.27.x):"
    echo "   → http://192.168.27.1:3000"
    echo ""
    echo "🔧 Keycloak:"
    echo "   → Основная сеть: http://10.11.0.16:8080"
    echo "   → WiFi сеть:     http://192.168.27.1:8080"
    echo ""
    echo "📝 Не забудьте:"
    echo "   1. Настроить Keycloak client с redirect URIs для обеих сетей"
    echo "   2. Проверить маршрутизацию между сетями на Gateway"
    echo "   3. Обновить IP адреса в nginx конфиге под вашу инфраструктуру"
    echo ""
}

# =============================================================================
# Основной скрипт
# =============================================================================

print_header

case "$ENVIRONMENT" in
    production)
        check_requirements
        install_dependencies
        build_app
        deploy_files
        configure_nginx
        print_summary
        ;;
    staging)
        check_requirements
        install_dependencies
        build_app
        deploy_files
        log_success "Staging развёртывание завершено"
        ;;
    local)
        check_requirements
        install_dependencies
        build_app
        log_success "Локальная сборка завершена. Запустите: npm run preview"
        ;;
    *)
        log_error "Неизвестное окружение: $ENVIRONMENT"
        echo "Использование: $0 [production|staging|local]"
        exit 1
        ;;
esac

exit 0