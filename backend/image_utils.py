import os
from io import BytesIO
from PIL import Image

MAX_IMAGE_SIZE = 2 * 1024 * 1024
MAX_WIDTH = 1920
MAX_HEIGHT = 1080

def compress_image(image_path, max_size=MAX_IMAGE_SIZE):
    if not os.path.exists(image_path):
        return image_path
    
    file_size = os.path.getsize(image_path)
    
    if file_size <= max_size:
        return image_path
    
    try:
        with Image.open(image_path) as img:
            original_format = img.format
            
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            ratio = min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height)
            if ratio < 1:
                new_width = int(img.width * ratio)
                new_height = int(img.height * ratio)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            quality = 85
            while True:
                buffer = BytesIO()
                if original_format == 'PNG':
                    img.save(buffer, format='PNG', optimize=True)
                else:
                    img.save(buffer, format='JPEG', quality=quality, optimize=True)
                
                if buffer.tell() <= max_size or quality <= 10:
                    buffer.seek(0)
                    with open(image_path, 'wb') as f:
                        f.write(buffer.read())
                    break
                
                quality -= 10
            
            return image_path
            
    except Exception as e:
        print(f"Image compression error: {e}")
        return image_path

def get_image_info(image_path):
    try:
        with Image.open(image_path) as img:
            return {
                'width': img.width,
                'height': img.height,
                'format': img.format,
                'mode': img.mode,
                'size': os.path.getsize(image_path)
            }
    except Exception:
        return None
