# PHP Web Service Docker Configuration for Render.com
FROM php:8.1-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo pdo_mysql mysqli zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Enable Apache modules
RUN a2enmod rewrite headers

# Copy Apache configuration
COPY docker/apache-config.conf /etc/apache2/sites-available/000-default.conf

# Copy application files
COPY . /var/www/html/

# Create necessary directories
RUN mkdir -p /var/www/html/logs \
    && mkdir -p /var/www/html/templates \
    && touch /var/www/html/logs/.gitkeep

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 775 /var/www/html/logs

# Create environment file from example if not exists
RUN if [ ! -f /var/www/html/config/production.env ]; then \
        cp /var/www/html/config/production.env.example /var/www/html/config/production.env; \
    fi

# Expose port (Render uses PORT env variable)
EXPOSE ${PORT:-80}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/api/health || exit 1

# Start Apache
CMD ["apache2-foreground"]
