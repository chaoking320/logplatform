# Python Log Platform

A Python-based log viewing platform that allows developers to easily access application logs from remote Linux servers without having to log in via a jump server.

## Features

- Remote log access through a web interface
- Multi-dimensional log queries (by date, time range, keywords)
- Real-time search and display
- Automatic log parsing and highlighting of levels and timestamps
- Support for segmented log files (e.g., .2026-01-08.1.log)

## Tech Stack

- Backend: Flask (Python 3.7+)
- Frontend: React (reusing the existing frontend)

## Requirements

- Python 3.7+
- pip

## Dependencies

The application relies on:
- Flask: For the web framework and API routing
- Flask-CORS: To handle cross-origin resource sharing
- Python Standard Library: For file operations (`os`, `pathlib`), regex (`re`), date handling (`datetime`), etc.

## Installation

1. Clone the repository
2. Navigate to the python_logplatform directory
3. Install dependencies:

```bash
pip install -r requirements.txt
```

## Configuration

The application uses the following environment variables (with defaults):

- `LOG_PATH`: Base path for logs (default: `./data/logs`)
- `APP_NAME`: Application name for log path construction (default: `task-center`)
- `LOG_PREFIX`: Log file prefix (default: `task-center-info`)

## Running the Application

To run the application:

```bash
python app.py
```

The application will be available at http://localhost:8080

## API Endpoints

- `GET /api/logs/query`: Query logs
  - Parameters:
    - `date`: Date in format yyyy-MM-dd
    - `keyword`: Search keyword (optional)
    - `startTime`: Start time in format HH:mm (default: 00:00)
    - `endTime`: End time in format HH:mm (default: 23:59)
    - `file`: Specific file name to query (optional)

- `GET /api/logs/dates`: Get available dates
- `GET /api/logs/files/{date}`: Get log files for a specific date with time ranges

## Directory Structure

```
python_logplatform/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## Example Log Format

The application is designed to work with logs in the following format:
```
[task-center:172.28.243.190:30736] [,] 2026-01-08 14:06:00.714 INFO 6762 [xxl-job, JobThread-11-1767852360014] com.***.***.TroubleSubmitJob Detailed log message
```