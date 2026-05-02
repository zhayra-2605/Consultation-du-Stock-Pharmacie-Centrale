import urllib.request
import json
import sys

def get_wheel_url():
    """Fetch the download URL for the scipy wheel from PyPI."""
    url = "https://pypi.org/pypi/scipy/1.17.1/json"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        
    for release in data.get('urls', []):
        if 'cp313-cp313-win_amd64' in release.get('filename', ''):
            return release['url'], release['filename']
    return None, None

def report_progress(count, block_size, total_size):
    """Callback function to display download progress."""
    percent = int(count * block_size * 100 / total_size)
    if percent % 2 == 0:
        sys.stdout.write(f"\rDownloading... {percent}%\t\t")
        sys.stdout.flush()

def main():
    """Main execution function."""
    wheel_url, filename = get_wheel_url()
    if not wheel_url:
        print("Wheel not found")
        sys.exit(1)

    print(f"Downloading {filename} from {wheel_url}")
    urllib.request.urlretrieve(wheel_url, filename, reporthook=report_progress)
    print("\nDownload complete.")

if __name__ == "__main__":
    main()
