import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import create_access_token, JWTManager, jwt_required, get_jwt_identity

# Initialize Flask App
app = Flask(__name__)

# Configure SQLAlchemy
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///rideshare.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configure Flask-JWT-Extended
# You MUST change this to a strong, random string in production!
app.config['JWT_SECRET_KEY'] = 'a9c07d183d2c62e077b72cdb2e248024ef1ee22d973c224a'
jwt = JWTManager(app)

db = SQLAlchemy(app)

CORS(app) # Enable CORS for all routes (consider restricting this in production)

# --- Database Models ---

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

    def __repr__(self):
        return f'<User {self.email}>'

class Ride(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Using User.id as ForeignKey for better database normalization
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user_email = db.Column(db.String(120), nullable=False) # Keep for quick reference, but user_id is the canonical link
    name = db.Column(db.String(100), nullable=False)
    contact = db.Column(db.String(100), nullable=False)
    destination = db.Column(db.String(100), nullable=False)
    days = db.Column(db.String(100), nullable=False) 
    homeDepartureTime = db.Column(db.String(10), nullable=False)
    officeDepartureTime = db.Column(db.String(10), nullable=False)
    seats = db.Column(db.Integer, nullable=False)
    smokingAllowed = db.Column(db.Boolean, nullable=False)
    cost = db.Column(db.String(50), nullable=True) 

    # Define a relationship to the User model if you want to access user details from a ride object
    user = db.relationship('User', backref='rides', lazy=True)

    def __repr__(self):
        return f'<Ride {self.destination} by {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id, # Include user_id in dict
            'user_email': self.user_email, # Include user_email in dict
            'name': self.name,
            'contact': self.contact,
            'destination': self.destination,
            'days': self.days.split(', ') if self.days else [],
            'homeDepartureTime': self.homeDepartureTime,
            'officeDepartureTime': self.officeDepartureTime,
            'seats': self.seats,
            'smokingAllowed': self.smokingAllowed,
            'cost': self.cost
        }

# --- Create Database Tables on Startup ---
# Note: If you already have a rideshare.db with the old schema, 
# you might need to delete it or use Flask-Migrate to update the schema.
# For now, deleting rideshare.db and letting it recreate is the simplest.
with app.app_context():
    db.create_all()


# --- User Authentication Endpoints ---

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'message': 'User with this email already exists'}), 409

    hashed_password = generate_password_hash(password)
    
    new_user = User(email=email, password_hash=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()

    if user and check_password_hash(user.password_hash, password):
        # Create a JWT for the user's identity (email)
        access_token = create_access_token(identity=user.email)
        return jsonify(access_token=access_token, user_email=user.email), 200
    else:
        return jsonify({'message': 'Invalid credentials'}), 401

# --- Ride Management Endpoints ---

@app.route('/rides', methods=['GET'])
def get_rides():
    rides = Ride.query.all()
    return jsonify([ride.to_dict() for ride in rides])

@app.route('/rides', methods=['POST'])
@jwt_required() # Protect this route: requires a valid JWT
def add_ride():
    current_user_email = get_jwt_identity() # Get the identity (email) from the JWT
    
    # Fetch the user object using the email from the token
    user = User.query.filter_by(email=current_user_email).first()
    if not user:
        return jsonify({'message': 'User not found based on token identity'}), 404

    data = request.json
    
    days_list = data.get('days')
    days_string = ', '.join(days_list) if isinstance(days_list, list) else ''

    new_ride = Ride(
        user_id=user.id, # Link ride to user ID
        user_email=user.email, # Store email for convenience (redundant with user_id but helps client)
        name=data.get('name'),
        contact=data.get('contact'),
        destination=data.get('destination'),
        days=days_string,
        homeDepartureTime=data.get('homeDepartureTime'),
        officeDepartureTime=data.get('officeDepartureTime'),
        seats=data.get('seats'),
        smokingAllowed=data.get('smokingAllowed'),
        cost=data.get('cost')
    )

    required_fields_data = {
        'name': new_ride.name,
        'contact': new_ride.contact,
        'destination': new_ride.destination,
        'days': days_list, # Check days_list for emptiness
        'homeDepartureTime': new_ride.homeDepartureTime,
        'officeDepartureTime': new_ride.officeDepartureTime,
        'seats': new_ride.seats,
        'smokingAllowed': new_ride.smokingAllowed
    }

    for field, value in required_fields_data.items():
        if value is None or (isinstance(value, str) and not value.strip()) or (isinstance(value, list) and not value):
            return jsonify({'message': f'Missing or empty required ride information: {field}'}), 400

    db.session.add(new_ride)
    db.session.commit()

    return jsonify(new_ride.to_dict()), 201

@app.route('/rides/<int:ride_id>', methods=['DELETE'])
@jwt_required() # Protect this route: requires a valid JWT
def delete_ride(ride_id):
    current_user_email = get_jwt_identity() # Get the identity (email) from the JWT

    # Fetch the user object based on the token identity
    user = User.query.filter_by(email=current_user_email).first()
    if not user:
        return jsonify({'message': 'User not found based on token identity'}), 404

    ride_to_delete = Ride.query.get(ride_id)

    if not ride_to_delete:
        return jsonify({'message': 'Ride not found'}), 404

    # Authorization check: ensure the ride belongs to the user trying to delete it
    # Now checking against user_id (more robust)
    if ride_to_delete.user_id != user.id:
        return jsonify({'message': 'Unauthorized to delete this ride'}), 403

    db.session.delete(ride_to_delete)
    db.session.commit()
    return jsonify({'message': 'Ride deleted successfully'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)