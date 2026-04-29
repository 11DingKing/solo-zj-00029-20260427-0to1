import os
import uuid
from datetime import datetime, date
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    get_jwt_identity, jwt_required
)
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash
from models import db, User, Tag, Diary, ScheduleNode, NodeImage, Like, Comment
from image_utils import compress_image

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'mysql+pymysql://travel:travel123456@localhost:3306/travel_diary')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', 'uploads')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = 2592000

CORS(app, supports_credentials=True)
jwt = JWTManager(app)
db.init_app(app)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return None

def get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(user_id)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Travel Diary API is running'}), 200

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not all([data.get('username'), data.get('email'), data.get('password')]):
        return jsonify({'error': 'Username, email and password are required'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 409
    
    user = User(
        username=data['username'],
        email=data['email']
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'message': 'User created successfully',
        'user': user.to_dict()
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    user = User.query.filter_by(email=data.get('email')).first()
    
    if not user or not user.check_password(data.get('password', '')):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict()
    }), 200

@app.route('/api/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    return jsonify({'access_token': access_token}), 200

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user_profile():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict()), 200

@app.route('/api/auth/me', methods=['PUT'])
@jwt_required()
def update_current_user():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if data.get('username') and data['username'] != user.username:
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 409
        user.username = data['username']
    
    if data.get('email') and data['email'] != user.email:
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 409
        user.email = data['email']
    
    if data.get('bio') is not None:
        user.bio = data['bio']
    
    if data.get('password'):
        user.set_password(data['password'])
    
    db.session.commit()
    
    return jsonify({
        'message': 'User updated successfully',
        'user': user.to_dict()
    }), 200

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user_profile(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    diaries = Diary.query.filter_by(user_id=user_id, is_public=True).order_by(Diary.created_at.desc()).all()
    
    all_nodes = db.session.query(ScheduleNode).join(Diary).filter(
        Diary.user_id == user_id,
        Diary.is_public == True
    ).all()
    
    visited_cities = {}
    for node in all_nodes:
        city = node.location_name
        if city not in visited_cities:
            visited_cities[city] = {'count': 0, 'latitude': node.latitude, 'longitude': node.longitude}
        visited_cities[city]['count'] += 1
    
    return jsonify({
        **user.to_dict(),
        'diaries_count': len(diaries),
        'visited_cities': visited_cities
    }), 200

@app.route('/api/users/<int:user_id>/diaries', methods=['GET'])
def get_user_diaries(user_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    query = Diary.query.filter_by(user_id=user_id, is_public=True).order_by(Diary.created_at.desc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'diaries': [d.to_dict() for d in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    }), 200

@app.route('/api/tags', methods=['GET'])
def get_tags():
    tags = Tag.query.order_by(Tag.id).all()
    return jsonify([tag.to_dict() for tag in tags]), 200

@app.route('/api/destinations', methods=['GET'])
def get_destinations():
    destinations = db.session.query(
        Diary.destination_city,
        db.func.count(Diary.id).label('diary_count')
    ).filter(
        Diary.is_public == True
    ).group_by(
        Diary.destination_city
    ).order_by(
        db.desc('diary_count')
    ).all()
    
    return jsonify([{
        'city': d.destination_city,
        'diary_count': d.diary_count
    } for d in destinations]), 200

@app.route('/api/destinations/ranking', methods=['GET'])
def get_destination_ranking():
    limit = request.args.get('limit', 20, type=int)
    
    destinations = db.session.query(
        Diary.destination_city,
        db.func.count(Diary.id).label('diary_count')
    ).filter(
        Diary.is_public == True
    ).group_by(
        Diary.destination_city
    ).order_by(
        db.desc('diary_count')
    ).limit(limit).all()
    
    return jsonify({
        'ranking': [{
            'rank': idx + 1,
            'city': d.destination_city,
            'diary_count': d.diary_count
        } for idx, d in enumerate(destinations)]
    }), 200

@app.route('/api/diaries', methods=['GET'])
def get_diaries():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    destination = request.args.get('destination', '')
    
    tags_raw = request.args.getlist('tags')
    tags = []
    for tag_str in tags_raw:
        if ',' in tag_str:
            tags.extend([t.strip() for t in tag_str.split(',') if t.strip()])
        else:
            if tag_str.strip():
                tags.append(tag_str.strip())
    
    tags_param = request.args.get('tags', '')
    if tags_param and ',' in tags_param and not tags:
        tags = [t.strip() for t in tags_param.split(',') if t.strip()]
    
    sort_by = request.args.get('sort_by', 'created_at')
    
    query = Diary.query.filter_by(is_public=True)
    
    if search:
        query = query.filter(
            db.or_(
                Diary.title.ilike(f'%{search}%'),
                Diary.description.ilike(f'%{search}%'),
                Diary.destination_city.ilike(f'%{search}%')
            )
        )
    
    if destination:
        query = query.filter(Diary.destination_city.ilike(f'%{destination}%'))
    
    if tags:
        query = query.join(Diary.tags).filter(Tag.name.in_(tags)).distinct()
    
    if sort_by == 'likes':
        query = query.order_by(Diary.likes_count.desc())
    elif sort_by == 'start_date':
        query = query.order_by(Diary.start_date.desc())
    else:
        query = query.order_by(Diary.created_at.desc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    current_user_id = None
    try:
        if request.headers.get('Authorization'):
            current_user_id = get_jwt_identity()
    except Exception:
        pass
    
    return jsonify({
        'diaries': [d.to_dict(current_user_id=current_user_id) for d in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    }), 200

@app.route('/api/diaries/<int:diary_id>', methods=['GET'])
def get_diary(diary_id):
    diary = Diary.query.get(diary_id)
    
    if not diary:
        return jsonify({'error': 'Diary not found'}), 404
    
    if not diary.is_public:
        try:
            current_user_id = get_jwt_identity()
            if diary.user_id != current_user_id:
                return jsonify({'error': 'Diary not accessible'}), 403
        except Exception:
            return jsonify({'error': 'Diary not accessible'}), 403
    
    current_user_id = None
    try:
        if request.headers.get('Authorization'):
            current_user_id = get_jwt_identity()
    except Exception:
        pass
    
    return jsonify(diary.to_dict(include_nodes=True, current_user_id=current_user_id)), 200

@app.route('/api/diaries', methods=['POST'])
@jwt_required()
def create_diary():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if not all([data.get('title'), data.get('destination_city'), data.get('start_date'), data.get('end_date')]):
        return jsonify({'error': 'Title, destination city, start date and end date are required'}), 400
    
    start_date = parse_date(data.get('start_date'))
    end_date = parse_date(data.get('end_date'))
    
    if not start_date or not end_date:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    if end_date < start_date:
        return jsonify({'error': 'End date must be after start date'}), 400
    
    diary = Diary(
        user_id=user.id,
        title=data['title'],
        destination_city=data['destination_city'],
        start_date=start_date,
        end_date=end_date,
        description=data.get('description', ''),
        is_public=data.get('is_public', True)
    )
    
    if data.get('tags'):
        tag_names = data['tags']
        tags = Tag.query.filter(Tag.name.in_(tag_names)).all()
        diary.tags = tags
    
    db.session.add(diary)
    db.session.commit()
    
    if data.get('nodes'):
        for node_data in data['nodes']:
            node_date = parse_date(node_data.get('node_date'))
            if not node_date:
                continue
            
            node = ScheduleNode(
                diary_id=diary.id,
                node_date=node_date,
                node_order=node_data.get('node_order', 0),
                location_name=node_data.get('location_name', ''),
                latitude=node_data.get('latitude'),
                longitude=node_data.get('longitude'),
                description=node_data.get('description', '')
            )
            db.session.add(node)
        
        db.session.commit()
    
    return jsonify({
        'message': 'Diary created successfully',
        'diary': diary.to_dict(include_nodes=True)
    }), 201

@app.route('/api/diaries/<int:diary_id>', methods=['PUT'])
@jwt_required()
def update_diary(diary_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    diary = Diary.query.get(diary_id)
    if not diary:
        return jsonify({'error': 'Diary not found'}), 404
    
    if diary.user_id != user.id:
        return jsonify({'error': 'Not authorized to update this diary'}), 403
    
    data = request.get_json()
    
    if data.get('title'):
        diary.title = data['title']
    
    if data.get('destination_city'):
        diary.destination_city = data['destination_city']
    
    if data.get('start_date'):
        start_date = parse_date(data.get('start_date'))
        if start_date:
            diary.start_date = start_date
    
    if data.get('end_date'):
        end_date = parse_date(data.get('end_date'))
        if end_date:
            diary.end_date = end_date
    
    if data.get('description') is not None:
        diary.description = data['description']
    
    if data.get('is_public') is not None:
        diary.is_public = data['is_public']
    
    if data.get('cover_image') is not None:
        diary.cover_image = data['cover_image']
    
    if data.get('tags') is not None:
        tag_names = data['tags']
        tags = Tag.query.filter(Tag.name.in_(tag_names)).all()
        diary.tags = tags
    
    db.session.commit()
    
    return jsonify({
        'message': 'Diary updated successfully',
        'diary': diary.to_dict(include_nodes=True)
    }), 200

@app.route('/api/diaries/<int:diary_id>', methods=['DELETE'])
@jwt_required()
def delete_diary(diary_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    diary = Diary.query.get(diary_id)
    if not diary:
        return jsonify({'error': 'Diary not found'}), 404
    
    if diary.user_id != user.id:
        return jsonify({'error': 'Not authorized to delete this diary'}), 403
    
    db.session.delete(diary)
    db.session.commit()
    
    return jsonify({'message': 'Diary deleted successfully'}), 200

@app.route('/api/diaries/<int:diary_id>/nodes', methods=['POST'])
@jwt_required()
def create_node(diary_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    diary = Diary.query.get(diary_id)
    if not diary:
        return jsonify({'error': 'Diary not found'}), 404
    
    if diary.user_id != user.id:
        return jsonify({'error': 'Not authorized'}), 403
    
    data = request.get_json()
    
    if not all([data.get('node_date'), data.get('location_name')]):
        return jsonify({'error': 'Node date and location name are required'}), 400
    
    node_date = parse_date(data.get('node_date'))
    if not node_date:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    node = ScheduleNode(
        diary_id=diary.id,
        node_date=node_date,
        node_order=data.get('node_order', 0),
        location_name=data['location_name'],
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        description=data.get('description', '')
    )
    
    db.session.add(node)
    db.session.commit()
    
    return jsonify({
        'message': 'Node created successfully',
        'node': node.to_dict()
    }), 201

@app.route('/api/nodes/<int:node_id>', methods=['PUT'])
@jwt_required()
def update_node(node_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    node = ScheduleNode.query.get(node_id)
    if not node:
        return jsonify({'error': 'Node not found'}), 404
    
    if node.diary.user_id != user.id:
        return jsonify({'error': 'Not authorized'}), 403
    
    data = request.get_json()
    
    if data.get('node_date'):
        node_date = parse_date(data.get('node_date'))
        if node_date:
            node.node_date = node_date
    
    if data.get('node_order') is not None:
        node.node_order = data['node_order']
    
    if data.get('location_name'):
        node.location_name = data['location_name']
    
    if data.get('latitude') is not None:
        node.latitude = data.get('latitude')
    
    if data.get('longitude') is not None:
        node.longitude = data.get('longitude')
    
    if data.get('description') is not None:
        node.description = data.get('description')
    
    db.session.commit()
    
    return jsonify({
        'message': 'Node updated successfully',
        'node': node.to_dict(include_images=True)
    }), 200

@app.route('/api/nodes/<int:node_id>', methods=['DELETE'])
@jwt_required()
def delete_node(node_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    node = ScheduleNode.query.get(node_id)
    if not node:
        return jsonify({'error': 'Node not found'}), 404
    
    if node.diary.user_id != user.id:
        return jsonify({'error': 'Not authorized'}), 403
    
    db.session.delete(node)
    db.session.commit()
    
    return jsonify({'message': 'Node deleted successfully'}), 200

@app.route('/api/upload', methods=['POST'])
@jwt_required()
def upload_image():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    upload_folder = app.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    
    user_folder = os.path.join(upload_folder, f'user_{user.id}')
    if not os.path.exists(user_folder):
        os.makedirs(user_folder)
    
    ext = secure_filename(file.filename).rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(user_folder, filename)
    
    file.save(filepath)
    
    compressed_path = compress_image(filepath)
    
    image_url = f'/api/uploads/user_{user.id}/{filename}'
    
    return jsonify({
        'message': 'Image uploaded successfully',
        'url': image_url,
        'filename': filename
    }), 200

@app.route('/api/uploads/<path:filename>', methods=['GET'])
def serve_uploaded_file(filename):
    upload_folder = app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)

@app.route('/api/diaries/<int:diary_id>/like', methods=['POST'])
@jwt_required()
def toggle_like(diary_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    diary = Diary.query.get(diary_id)
    if not diary:
        return jsonify({'error': 'Diary not found'}), 404
    
    if not diary.is_public and diary.user_id != user.id:
        return jsonify({'error': 'Diary not accessible'}), 403
    
    existing_like = Like.query.filter_by(user_id=user.id, diary_id=diary_id).first()
    
    if existing_like:
        db.session.delete(existing_like)
        diary.likes_count = max(0, diary.likes_count - 1)
        is_liked = False
    else:
        like = Like(user_id=user.id, diary_id=diary_id)
        db.session.add(like)
        diary.likes_count = diary.likes_count + 1
        is_liked = True
    
    db.session.commit()
    
    return jsonify({
        'is_liked': is_liked,
        'likes_count': diary.likes_count
    }), 200

@app.route('/api/diaries/<int:diary_id>/comments', methods=['GET'])
def get_comments(diary_id):
    diary = Diary.query.get(diary_id)
    if not diary:
        return jsonify({'error': 'Diary not found'}), 404
    
    if not diary.is_public:
        try:
            current_user_id = get_jwt_identity()
            if diary.user_id != current_user_id:
                return jsonify({'error': 'Diary not accessible'}), 403
        except Exception:
            return jsonify({'error': 'Diary not accessible'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    comments = Comment.query.filter_by(diary_id=diary_id, parent_id=None).order_by(
        Comment.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    def get_all_replies(comment):
        result = comment.to_dict()
        result['replies'] = []
        for reply in Comment.query.filter_by(parent_id=comment.id).order_by(Comment.created_at).all():
            result['replies'].append(get_all_replies(reply))
        return result
    
    return jsonify({
        'comments': [get_all_replies(c) for c in comments.items],
        'total': comments.total,
        'page': page,
        'per_page': per_page
    }), 200

@app.route('/api/diaries/<int:diary_id>/comments', methods=['POST'])
@jwt_required()
def create_comment(diary_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    diary = Diary.query.get(diary_id)
    if not diary:
        return jsonify({'error': 'Diary not found'}), 404
    
    if not diary.is_public and diary.user_id != user.id:
        return jsonify({'error': 'Diary not accessible'}), 403
    
    data = request.get_json()
    
    if not data.get('content'):
        return jsonify({'error': 'Comment content is required'}), 400
    
    comment = Comment(
        user_id=user.id,
        diary_id=diary_id,
        content=data['content'],
        parent_id=data.get('parent_id'),
        reply_to_user_id=data.get('reply_to_user_id')
    )
    
    db.session.add(comment)
    diary.comments_count = diary.comments_count + 1
    db.session.commit()
    
    return jsonify({
        'message': 'Comment created successfully',
        'comment': comment.to_dict()
    }), 201

@app.route('/api/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404
    
    if comment.user_id != user.id:
        return jsonify({'error': 'Not authorized'}), 403
    
    diary = Diary.query.get(comment.diary_id)
    
    db.session.delete(comment)
    if diary:
        diary.comments_count = max(0, diary.comments_count - 1)
    db.session.commit()
    
    return jsonify({'message': 'Comment deleted successfully'}), 200

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    total_users = User.query.count()
    total_diaries = Diary.query.filter_by(is_public=True).count()
    total_comments = Comment.query.count()
    
    top_diaries = Diary.query.filter_by(is_public=True).order_by(
        Diary.likes_count.desc()
    ).limit(5).all()
    
    return jsonify({
        'total_users': total_users,
        'total_diaries': total_diaries,
        'total_comments': total_comments,
        'top_diaries': [d.to_dict() for d in top_diaries]
    }), 200

with app.app_context():
    try:
        db.create_all()
        existing_tags = Tag.query.count()
        if existing_tags == 0:
            default_tags = [
                ('family', '亲子游'),
                ('self_driving', '自驾'),
                ('backpacker', '背包客'),
                ('honeymoon', '蜜月旅行'),
                ('business', '商务出差'),
                ('study', '游学'),
                ('photography', '摄影之旅'),
                ('food', '美食之旅'),
                ('adventure', '探险旅行'),
                ('cultural', '文化之旅')
            ]
            for name, name_cn in default_tags:
                tag = Tag(name=name, name_cn=name_cn)
                db.session.add(tag)
            db.session.commit()
            print("Default tags created successfully")
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization warning: {e}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
