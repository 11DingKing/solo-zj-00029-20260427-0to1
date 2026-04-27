from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar = db.Column(db.String(255))
    bio = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    diaries = db.relationship('Diary', backref='author', lazy='dynamic', cascade='all, delete-orphan')
    likes = db.relationship('Like', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='author', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'avatar': self.avatar,
            'bio': self.bio,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


diary_tags = db.Table('diary_tags',
    db.Column('diary_id', db.Integer, db.ForeignKey('diaries.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tags.id'), primary_key=True)
)


class Tag(db.Model):
    __tablename__ = 'tags'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    name_cn = db.Column(db.String(50), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'name_cn': self.name_cn
        }


class Diary(db.Model):
    __tablename__ = 'diaries'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    destination_city = db.Column(db.String(100), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    cover_image = db.Column(db.String(255))
    description = db.Column(db.Text)
    is_public = db.Column(db.Boolean, default=True)
    likes_count = db.Column(db.Integer, default=0)
    comments_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    tags = db.relationship('Tag', secondary=diary_tags, backref='diaries')
    nodes = db.relationship('ScheduleNode', backref='diary', lazy='dynamic', order_by='ScheduleNode.node_date, ScheduleNode.node_order', cascade='all, delete-orphan')
    likes = db.relationship('Like', backref='diary', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='diary', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self, include_nodes=False, current_user_id=None):
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'destination_city': self.destination_city,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'cover_image': self.cover_image,
            'description': self.description,
            'is_public': self.is_public,
            'likes_count': self.likes_count,
            'comments_count': self.comments_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'duration_days': (self.end_date - self.start_date).days + 1 if self.start_date and self.end_date else 0,
            'author': self.author.to_dict() if self.author else None,
            'tags': [tag.to_dict() for tag in self.tags]
        }
        
        if current_user_id:
            liked = Like.query.filter_by(user_id=current_user_id, diary_id=self.id).first()
            result['is_liked_by_current_user'] = liked is not None
        
        if include_nodes:
            result['nodes'] = [node.to_dict(include_images=True) for node in self.nodes]
        
        return result


class ScheduleNode(db.Model):
    __tablename__ = 'schedule_nodes'
    
    id = db.Column(db.Integer, primary_key=True)
    diary_id = db.Column(db.Integer, db.ForeignKey('diaries.id'), nullable=False)
    node_date = db.Column(db.Date, nullable=False)
    node_order = db.Column(db.Integer, nullable=False)
    location_name = db.Column(db.String(200), nullable=False)
    latitude = db.Column(db.Numeric(10, 7))
    longitude = db.Column(db.Numeric(10, 7))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    images = db.relationship('NodeImage', backref='node', lazy='dynamic', order_by='NodeImage.image_order', cascade='all, delete-orphan')
    
    def to_dict(self, include_images=False):
        result = {
            'id': self.id,
            'diary_id': self.diary_id,
            'node_date': self.node_date.isoformat() if self.node_date else None,
            'node_order': self.node_order,
            'location_name': self.location_name,
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'description': self.description
        }
        
        if include_images:
            result['images'] = [img.to_dict() for img in self.images]
        
        return result


class NodeImage(db.Model):
    __tablename__ = 'node_images'
    
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('schedule_nodes.id'), nullable=False)
    image_url = db.Column(db.String(255), nullable=False)
    image_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'node_id': self.node_id,
            'image_url': self.image_url,
            'image_order': self.image_order
        }


class Like(db.Model):
    __tablename__ = 'likes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    diary_id = db.Column(db.Integer, db.ForeignKey('diaries.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'diary_id', name='unique_user_like'),
    )


class Comment(db.Model):
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    diary_id = db.Column(db.Integer, db.ForeignKey('diaries.id'), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('comments.id'))
    reply_to_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    content = db.Column(db.Text, nullable=False)
    likes_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    parent = db.relationship('Comment', remote_side=[id], backref='replies')
    reply_to_user = db.relationship('User', foreign_keys=[reply_to_user_id])
    
    def to_dict(self, include_replies=False):
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'diary_id': self.diary_id,
            'parent_id': self.parent_id,
            'reply_to_user_id': self.reply_to_user_id,
            'content': self.content,
            'likes_count': self.likes_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'author': self.author.to_dict() if self.author else None,
            'reply_to_user': self.reply_to_user.to_dict() if self.reply_to_user else None
        }
        
        if include_replies:
            result['replies'] = [reply.to_dict() for reply in self.replies]
        
        return result
