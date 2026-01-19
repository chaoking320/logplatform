from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import re
from datetime import datetime
from pathlib import Path
import json

app = Flask(__name__, static_folder='../front')
CORS(app)  # Enable CORS for all routes


class LogPlatformConfig:
    """Configuration class similar to Java version"""
    def __init__(self):
        # Default values similar to Java version
        self.log_path = os.environ.get('LOG_PATH', './data/logs')
        self.app_name = os.environ.get('APP_NAME', 'task-center')
        self.log_prefix = os.environ.get('LOG_PREFIX', 'task-center-info')

    @property
    def full_log_path(self):
        """Get the full log directory path"""
        path = os.path.join(self.log_path, self.app_name)
        # Create directory if it doesn't exist
        os.makedirs(path, exist_ok=True)
        return path


class LogService:
    """Service class to handle log operations, similar to Java version"""
    def __init__(self):
        self.config = LogPlatformConfig()
        # Define timestamp pattern to match Java version
        self.timestamp_pattern = re.compile(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})")

    def query_logs(self, date, keyword=None, start_time="00:00:00", end_time="23:59:59", file_name=None):
        """
        Query logs based on date and keyword
        Similar to Java version's queryLogs method
        """
        results = []

        # Find matching files: task-center-info.log (for today) or task-center-info.2026-01-14.*.log (for history)
        log_dir = Path(self.config.full_log_path)
        
        if not log_dir.exists():
            print(f"Log directory does not exist: {self.config.full_log_path}")
            return results

        # Get current date for comparison
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        # Filter files based on criteria
        if file_name:
            # If specific file name is provided, look for that file only
            files = [f for f in log_dir.iterdir() 
                    if f.is_file() and f.name == file_name]
        else:
            # Otherwise, find files based on date
            files = []
            for file_path in log_dir.iterdir():
                if not file_path.is_file() or not str(file_path).endswith('.log'):
                    continue
                
                if date == current_date and file_path.name == f"{self.config.log_prefix}.log":
                    files.append(file_path)
                elif date in file_path.name and file_path.name.startswith(self.config.log_prefix) and file_path.name.endswith('.log'):
                    files.append(file_path)

        if not files:
            print(f"No matching log files found, path: {self.config.full_log_path}, date: {date}" +
                  (f", file: {file_name}" if file_name else ""))
            return results

        # Sort files by name to ensure consistent order
        files.sort(key=self._compare_log_file_names)

        # Process each file
        for file_path in files:
            print(f"Processing log file: {file_path.name}")
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                
                # Filter lines based on time range and keyword
                matched_lines = []
                for line in lines:
                    if len(results) >= 5000:  # Limit total results
                        break
                        
                    if len(matched_lines) >= 2000:  # Limit per file
                        break
                        
                    # Time range check
                    time_match = self.is_within_time_range(line, start_time, end_time)
                    
                    # Keyword check
                    kw_match = True
                    if keyword:
                        kw_match = keyword.lower() in line.lower()
                    
                    if time_match and kw_match:
                        matched_lines.append(line.rstrip('\n\r'))
                
                results.extend(matched_lines)
                if len(results) >= 5000:
                    break
                    
            except Exception as e:
                print(f"Error reading file {file_path}: {str(e)}")
        
        print(f"Found {len(results)} matching log entries")
        return results

    def _compare_log_file_names(self, file_path):
        """Helper to sort log files, similar to Java version"""
        name = file_path.name
        
        # Current active log file goes last
        if name == f"{self.config.log_prefix}.log":
            return float('inf')
        
        # Extract date and number for sorting
        parts = self._extract_date_and_number(name)
        
        # Sort by date first, then by number
        date_part = parts[0] if parts[0] else ""
        num_part = int(parts[1]) if parts[1].isdigit() else 0
        
        return (date_part, num_part)

    def _extract_date_and_number(self, file_name):
        """Extract date and number from log file name"""
        # Match pattern like: task-center-info.2026-01-08.1.log
        pattern = rf"{re.escape(self.config.log_prefix)}\.([0-9]{{4}}-[0-9]{{2}}-[0-9]{{2}})\.(\d+)\.log"
        match = re.search(pattern, file_name)
        
        if match:
            return [match.group(1), match.group(2)]
        
        return ["", "0"]

    def is_within_time_range(self, line, start_time, end_time):
        """Check if log line is within specified time range"""
        matches = self.timestamp_pattern.search(line)
        if matches:
            timestamp = matches.group(1)  # Format: yyyy-MM-dd HH:mm:ss
            log_time = timestamp.split(" ")[1]  # Extract HH:mm:ss part
            
            # Compare time
            return start_time <= log_time <= end_time
        
        # If no timestamp found, include if range covers entire day
        return start_time <= "00:00:00" and end_time >= "23:59:59"

    def get_available_dates(self):
        """Get available dates from log files"""
        dates = set()
        log_dir = Path(self.config.full_log_path)
        
        if not log_dir.exists():
            print(f"Log directory does not exist: {self.config.full_log_path}")
            return sorted(list(dates))

        current_date = datetime.now().strftime("%Y-%m-%d")
        
        for file_path in log_dir.iterdir():
            if not file_path.is_file() or not str(file_path).endswith('.log'):
                continue
                
            if file_path.name.startswith(self.config.log_prefix):
                # Try to extract date from filename
                parts = self._extract_date_and_number(file_path.name)
                if parts[0]:  # If date was extracted
                    dates.add(parts[0])
                elif file_path.name == f"{self.config.log_prefix}.log":
                    # Current log file - add today's date
                    dates.add(current_date)

        return sorted(list(dates))

    def get_date_log_files_with_time_range(self, date):
        """Get log files for a specific date with their time ranges"""
        result = []
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        log_dir = Path(self.config.full_log_path)
        
        if not log_dir.exists():
            print(f"Log directory does not exist: {self.config.full_log_path}")
            return result

        # Find files for the specified date
        files = []
        for file_path in log_dir.iterdir():
            if not file_path.is_file() or not str(file_path).endswith('.log'):
                continue
                
            if (date == current_date and file_path.name == f"{self.config.log_prefix}.log") or \
               (date in file_path.name and file_path.name.startswith(self.config.log_prefix)):
                files.append(file_path)

        # Sort files
        files.sort(key=self._compare_log_file_names)

        # Analyze each file's time range
        for file_path in files:
            file_info = self._analyze_file_time_range(file_path)
            if file_info:
                result.append(file_info)

        return result

    def _analyze_file_time_range(self, file_path):
        """Analyze the time range of a single log file"""
        file_info = {
            'fileName': file_path.name,
            'earliestTime': None,
            'latestTime': None
        }
        
        earliest_time = None
        latest_time = None
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    matches = self.timestamp_pattern.search(line)
                    if matches:
                        timestamp = matches.group(1)  # Format: yyyy-MM-dd HH:mm:ss
                        
                        if earliest_time is None or timestamp < earliest_time:
                            earliest_time = timestamp
                        
                        if latest_time is None or timestamp > latest_time:
                            latest_time = timestamp
            
            file_info['earliestTime'] = earliest_time or "未知"
            file_info['latestTime'] = latest_time or "未知"
            
        except Exception as e:
            print(f"Error reading file {file_path}: {str(e)}")
            return None
        
        return file_info


# Initialize the log service
log_service = LogService()


@app.route('/')
def serve_index():
    """Serve the main index.html file"""
    return send_from_directory('../front', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (JS, CSS, etc.)"""
    return send_from_directory('../front', path)


@app.route('/api/logs/query')
def api_query_logs():
    """API endpoint to query logs, similar to Java version"""
    try:
        date = request.args.get('date', '')
        keyword = request.args.get('keyword', '')
        start_time = request.args.get('startTime', '00:00:00')
        end_time = request.args.get('endTime', '23:59:59')
        file_name = request.args.get('file', '')  # Optional file parameter

        # Handle empty strings
        if not keyword:
            keyword = None
        if not file_name:
            file_name = None

        # Convert HH:mm format to HH:mm:ss if needed
        if ':' in start_time and len(start_time) == 5:  # HH:mm
            start_time += ":00"
        if ':' in end_time and len(end_time) == 5:  # HH:mm
            end_time += ":59"

        logs = log_service.query_logs(date, keyword, start_time, end_time, file_name)
        return jsonify({"success": True, "data": logs, "message": "success"})
    
    except Exception as e:
        print(f"Error querying logs: {str(e)}")
        return jsonify({"success": False, "message": f"查询日志失败: {str(e)}"}), 500


@app.route('/api/logs/dates')
def api_get_available_dates():
    """API endpoint to get available dates"""
    try:
        dates = log_service.get_available_dates()
        return jsonify({"success": True, "data": dates, "message": "success"})
    
    except Exception as e:
        print(f"Error getting available dates: {str(e)}")
        return jsonify({"success": False, "message": f"获取日期列表失败: {str(e)}"}), 500


@app.route('/api/logs/files/<date>')
def api_get_date_log_files(date):
    """API endpoint to get log files for a specific date"""
    try:
        files = log_service.get_date_log_files_with_time_range(date)
        return jsonify({"success": True, "data": files, "message": "success"})
    
    except Exception as e:
        print(f"Error getting date log files: {str(e)}")
        return jsonify({"success": False, "message": f"获取日期下的文件列表失败: {str(e)}"}), 500


if __name__ == '__main__':
    print(f"Starting Python Log Platform...")
    print(f"Log directory: {log_service.config.full_log_path}")
    app.run(debug=True, host='0.0.0.0', port=8080)