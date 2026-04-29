#!/usr/bin/env python3
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from werkzeug.security import generate_password_hash
from models import db, User, Tag, Diary, ScheduleNode

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL',
    'mysql+pymysql://travel:travel123456@localhost:3306/travel_diary'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

def seed_database():
    print("开始填充测试数据...")
    
    print("\n1. 检查默认标签...")
    existing_tags = Tag.query.all()
    if not existing_tags:
        default_tags = [
            {'name': 'nature', 'name_cn': '自然风光'},
            {'name': 'city', 'name_cn': '城市探索'},
            {'name': 'food', 'name_cn': '美食之旅'},
            {'name': 'culture', 'name_cn': '文化体验'},
            {'name': 'adventure', 'name_cn': '户外探险'},
            {'name': 'relaxation', 'name_cn': '休闲度假'},
            {'name': 'shopping', 'name_cn': '购物'},
            {'name': 'family', 'name_cn': '家庭游'},
        ]
        for tag_data in default_tags:
            tag = Tag(**tag_data)
            db.session.add(tag)
        db.session.commit()
        print(f"   已创建 {len(default_tags)} 个默认标签")
    else:
        print(f"   已存在 {len(existing_tags)} 个标签")
    
    print("\n2. 检查测试用户...")
    test_user = User.query.filter_by(email='demo@example.com').first()
    if not test_user:
        test_user = User(
            username='旅行者小明',
            email='demo@example.com',
            password_hash=generate_password_hash('demo123456')
        )
        db.session.add(test_user)
        db.session.commit()
        print(f"   已创建测试用户: 旅行者小明 (demo@example.com / demo123456)")
    else:
        print(f"   测试用户已存在: {test_user.username}")
    
    print("\n3. 检查测试日记...")
    existing_diaries = Diary.query.filter_by(user_id=test_user.id).all()
    if not existing_diaries:
        nature_tag = Tag.query.filter_by(name='nature').first()
        food_tag = Tag.query.filter_by(name='food').first()
        culture_tag = Tag.query.filter_by(name='culture').first()
        city_tag = Tag.query.filter_by(name='city').first()
        
        diary1 = Diary(
            user_id=test_user.id,
            title='北京五日游 - 感受千年古都的魅力',
            destination_city='北京',
            start_date=date(2026, 4, 20),
            end_date=date(2026, 4, 24),
            description='这是一次难忘的北京之旅，游览了故宫、长城、颐和园等著名景点，品尝了地道的北京烤鸭。',
            is_public=True
        )
        diary1.tags = [culture_tag, city_tag, food_tag] if culture_tag and city_tag and food_tag else []
        
        diary2 = Diary(
            user_id=test_user.id,
            title='云南大理三日游 - 风花雪月的浪漫',
            destination_city='大理',
            start_date=date(2026, 5, 1),
            end_date=date(2026, 5, 3),
            description='漫步在大理古城，欣赏洱海的日落，感受白族文化的独特魅力。',
            is_public=True
        )
        diary2.tags = [nature_tag, culture_tag, relaxation_tag] if nature_tag and culture_tag else []
        
        db.session.add_all([diary1, diary2])
        db.session.commit()
        print(f"   已创建 2 篇测试日记")
        
        print("\n4. 添加日程节点...")
        
        node1_1 = ScheduleNode(
            diary_id=diary1.id,
            node_date=date(2026, 4, 20),
            node_order=0,
            location_name='故宫博物院',
            latitude=39.9167,
            longitude=116.4167,
            description='**第一天：故宫博物院**\n\n上午抵达北京，下午游览**故宫博物院**。\n\n这座明清两代的皇家宫殿，气势恢宏，金碧辉煌。\n\n![故宫](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Forbidden%20City%20Palace%20Museum%20Beijing%20traditional%20Chinese%20architecture%20red%20walls%20golden%20roofs&image_size=square)\n\n**注意事项**：\n- 建议提前网上预约\n- 穿舒适的鞋子\n- 预留至少半天时间'
        )
        
        node1_2 = ScheduleNode(
            diary_id=diary1.id,
            node_date=date(2026, 4, 21),
            node_order=1,
            location_name='八达岭长城',
            latitude=40.3579,
            longitude=116.0219,
            description='**第二天：八达岭长城**\n\n"不到长城非好汉"，今天终于登上了**万里长城**！\n\n![长城](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Great%20Wall%20of%20China%20Badaling%20section%20mountain%20landscape%20historical%20site&image_size=square)\n\n站在长城上，看着蜿蜒曲折的城墙在群山中延伸，不禁感叹古人的智慧和毅力。\n\n**实用信息**：\n- 可以坐缆车上下\n- 建议早上去，人少凉快'
        )
        
        node1_3 = ScheduleNode(
            diary_id=diary1.id,
            node_date=date(2026, 4, 22),
            node_order=2,
            location_name='颐和园',
            latitude=39.9932,
            longitude=116.2755,
            description='**第三天：颐和园**\n\n今天游览**颐和园**，这座皇家园林真是太美了！\n\n昆明湖波光粼粼，万寿山郁郁葱葱，长廊上的彩绘栩栩如生。\n\n![颐和园](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Summer%20Palace%20Beijing%20Kunming%20Lake%20Chinese%20imperial%20garden%20traditional%20architecture&image_size=square)\n\n**推荐路线**：\n1. 东宫门进\n2. 游览仁寿殿\n3. 走长廊\n4. 登佛香阁\n5. 坐船游昆明湖'
        )
        
        node1_4 = ScheduleNode(
            diary_id=diary1.id,
            node_date=date(2026, 4, 23),
            node_order=3,
            location_name='北京烤鸭',
            latitude=39.9042,
            longitude=116.4074,
            description='**第四天：美食之旅**\n\n终于吃到了传说中的**北京烤鸭**！\n\n![北京烤鸭](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Peking%20Duck%20Chinese%20cuisine%20roasted%20duck%20crispy%20skin%20restaurant%20setting&image_size=square)\n\n**吃法讲究**：\n1. 取一张荷叶饼\n2. 放几片带皮的鸭肉\n3. 加几根葱丝和黄瓜条\n4. 抹上甜面酱\n5. 卷起来吃\n\n太美味了！一口下去，鸭皮酥脆，鸭肉鲜嫩，酱汁浓郁。'
        )
        
        node2_1 = ScheduleNode(
            diary_id=diary2.id,
            node_date=date(2026, 5, 1),
            node_order=0,
            location_name='大理古城',
            latitude=25.6065,
            longitude=100.2679,
            description='**第一天：大理古城**\n\n走进**大理古城**，仿佛穿越回古代。\n\n青石板路、白墙青瓦、鲜花盛开，处处都是风景。\n\n![大理古城](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Dali%20Old%20Town%20Yunnan%20China%20traditional%20Bai%20ethnic%20architecture%20cobblestone%20streets&image_size=square)\n\n**必体验**：\n- 五华楼看全景\n- 洋人街喝咖啡\n- 人民路逛小店'
        )
        
        node2_2 = ScheduleNode(
            diary_id=diary2.id,
            node_date=date(2026, 5, 2),
            node_order=1,
            location_name='洱海',
            latitude=25.6667,
            longitude=100.2833,
            description='**第二天：环洱海骑行**\n\n租了一辆电动车，沿**洱海**骑行。\n\n海风轻拂，阳光温暖，沿途风景美不胜收。\n\n![洱海](https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Erhai%20Lake%20Dali%20Yunnan%20China%20scenic%20lake%20view%20mountain%20reflection%20sunset&image_size=square)\n\n**骑行路线推荐**：\n1. 才村码头\n2. 喜洲古镇（必去！）\n3. 海舌公园\n4. 双廊古镇\n\n在喜洲吃了正宗的喜洲粑粑，甜咸两种都好吃！'
        )
        
        db.session.add_all([
            node1_1, node1_2, node1_3, node1_4,
            node2_1, node2_2
        ])
        db.session.commit()
        print("   已添加 6 个日程节点")
    else:
        print(f"   测试用户已有 {len(existing_diaries)} 篇日记")
    
    print("\n" + "="*50)
    print("测试数据填充完成！")
    print("="*50)
    print("\n测试账号信息：")
    print("  邮箱: demo@example.com")
    print("  密码: demo123456")
    print("  用户名: 旅行者小明")
    print("\n你可以使用这个账号登录测试所有功能。")

if __name__ == '__main__':
    with app.app_context():
        seed_database()
