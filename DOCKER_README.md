# eStore Docker Setup Guide

## Overview
Complete Docker setup for your eStore application with MySQL database, phpMyAdmin, and optional Node.js application container.

## Prerequisites
- Docker Desktop installed (Windows/Mac) or Docker Engine (Linux)
- At least 2GB RAM available
- Your eStore Node.js application code

## Quick Start

### 1. Update Your Node.js Database Configuration
Update your `shared/pool.js` to use Docker environment variables:

```javascript
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "estore_user",
  password: process.env.DB_PASSWORD || "estore_password",
  database: process.env.DB_NAME || "estore1",
  port: process.env.DB_PORT || 3306,
  multipleStatements: true,
});

module.exports = pool;
```

### 2. Start the Services

#### Option A: Database Only (Recommended for development)
```bash
# Start only MySQL and phpMyAdmin
docker-compose up mysql phpmyadmin -d

# Check status
docker-compose ps

# View logs
docker-compose logs mysql
```

#### Option B: Full Stack (Database + Application)
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Access Your Services

#### Database Access:
- **MySQL**: `localhost:3306`
- **Username**: `estore_user`
- **Password**: `estore_password`
- **Database**: `estore1`
- **Root Password**: `estore_root_password`

#### phpMyAdmin (Web Interface):
- **URL**: `http://localhost:8080`
- **Username**: `root`
- **Password**: `estore_root_password`

#### Node.js Application:
- **URL**: `http://localhost:5001`
- **API Endpoints**: Same as your local setup

## Database Initialization

The database will be automatically initialized with:
1. **Database schema** (tables, indexes, triggers)
2. **Sample data** (users, products, categories, orders)
3. **Maintenance scripts** (procedures, views)

## Docker Services Details

### MySQL Service
- **Image**: `mysql:8.0`
- **Container**: `estore_mysql`
- **Port**: `3306:3306`
- **Volume**: Persistent data storage
- **Health Check**: Automatic health monitoring

### phpMyAdmin Service
- **Image**: `phpmyadmin/phpmyadmin:latest`
- **Container**: `estore_phpmyadmin`
- **Port**: `8080:80`
- **Depends on**: MySQL service

### Node.js Application Service (Optional)
- **Build**: From Dockerfile
- **Container**: `estore_app`
- **Port**: `5001:5001`
- **Environment**: Database connection variables

## Common Docker Commands

### Basic Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart services
docker-compose restart

# View logs
docker-compose logs -f mysql
docker-compose logs -f estore_app
```

### Database Management
```bash
# Connect to MySQL container
docker exec -it estore_mysql mysql -u root -p

# Execute SQL commands
docker exec -it estore_mysql mysql -u estore_user -pestore_password estore1

# Backup database
docker exec estore_mysql mysqldump -u root -pestore_root_password estore1 > backup.sql

# Restore database
docker exec -i estore_mysql mysql -u root -pestore_root_password estore1 < backup.sql
```

### Development Workflow
```bash
# Start database only
docker-compose up mysql phpmyadmin -d

# Run your Node.js app locally (for development)
cd eStore
npm install
npm start

# Or run app in Docker
docker-compose up estore_app --build
```

## Environment Variables

Create a `.env` file for customization:

```bash
# Database Configuration
MYSQL_ROOT_PASSWORD=estore_root_password
MYSQL_DATABASE=estore1
MYSQL_USER=estore_user
MYSQL_PASSWORD=estore_password

# Application Configuration
DB_HOST=mysql
DB_USER=estore_user
DB_PASSWORD=estore_password
DB_NAME=estore1
DB_PORT=3306

# Ports
MYSQL_PORT=3306
PHPMYADMIN_PORT=8080
APP_PORT=5001
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using port 3306
netstat -tulpn | grep :3306

# Change port in docker-compose.yml
ports:
  - "3307:3306"  # Use 3307 instead
```

#### Permission Issues
```bash
# Reset permissions
docker-compose down
docker system prune -f
docker-compose up -d
```

#### Database Connection Issues
```bash
# Check MySQL container logs
docker-compose logs mysql

# Test connection from container
docker exec -it estore_mysql mysql -u estore_user -pestore_password estore1

# Restart MySQL service
docker-compose restart mysql
```

#### Application Won't Start
```bash
# Rebuild application container
docker-compose up estore_app --build

# Check application logs
docker-compose logs estore_app
```

### Health Check Status
```bash
# Check service health
docker-compose ps

# Detailed health information
docker inspect estore_mysql | grep Health -A 10
```

## Production Considerations

### Security
- Change default passwords
- Use environment files for secrets
- Restrict database access
- Enable SSL connections

### Performance
- Increase MySQL memory allocation
- Use persistent volumes for data
- Monitor container resources
- Set up proper logging

### Backup Strategy
```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec estore_mysql mysqldump -u root -pestore_root_password estore1 > "estore_backup_$DATE.sql"
```

## Next Steps

1. **Start the services**: `docker-compose up -d`
2. **Access phpMyAdmin**: `http://localhost:8080`
3. **Test your application**: Connect to `localhost:3306`
4. **Develop your app**: Use the database for testing
5. **Deploy**: Use the same setup for production

## File Structure

```
your-project/
├── docker-compose.yml
├── Dockerfile
├── estore_database_setup.sql
├── estore_sample_data.sql
├── estore_maintenance.sql
├── DATABASE_README.md
├── DOCKER_README.md
└── eStore/                    # Your Node.js application
    ├── package.json
    ├── index.js
    ├── routes/
    ├── shared/
    └── ...
```

This Docker setup provides a complete, isolated environment for your eStore application with automatic database initialization and easy management.
