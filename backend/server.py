from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import uuid
import logging
import jwt
import bcrypt
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "todoapp_fitness")
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="ToDoApp Plus - Fitness API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ==================== PYDANTIC MODELS ====================

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    account_level: str = "Novice"
    total_volume_kg: float = 0
    current_streak_days: int = 0
    longest_streak_days: int = 0
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Exercise Models
class ExerciseBase(BaseModel):
    name: str
    muscle: str
    exercise_type: str
    pattern: str
    equipment: str
    subtype: Optional[str] = None
    notes: Optional[str] = None

class ExerciseResponse(ExerciseBase):
    id: str

# Routine Models
class RoutineExerciseCreate(BaseModel):
    exercise_id: str
    exercise_order: int
    sets_planned: int = 3
    reps_planned: Optional[int] = 10
    reps_min: Optional[int] = None
    reps_max: Optional[int] = None
    target_weight_kg: Optional[float] = None
    rest_seconds: int = 90
    notes: Optional[str] = None

class RoutineExerciseResponse(BaseModel):
    id: str
    exercise_id: str
    exercise_name: str
    exercise_order: int
    sets_planned: int
    reps_planned: Optional[int]
    reps_min: Optional[int]
    reps_max: Optional[int]
    target_weight_kg: Optional[float]
    rest_seconds: int
    notes: Optional[str]

class RoutineCreate(BaseModel):
    name: str
    description: Optional[str] = None
    routine_type: str  # PUSH, PULL, LEGS, UPPER_BODY, LOWER_BODY, FREE
    difficulty_level: str = "Intermediate"  # Beginner, Intermediate, Advanced
    exercises: List[RoutineExerciseCreate] = []

class RoutineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    routine_type: Optional[str] = None
    difficulty_level: Optional[str] = None

class RoutineResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    routine_type: str
    difficulty_level: str
    times_completed: int = 0
    exercises: List[RoutineExerciseResponse] = []
    created_at: datetime
    updated_at: datetime

# Workout Session Models
class ExerciseSetCreate(BaseModel):
    set_number: int
    reps_completed: int
    weight_kg: float
    rpe: Optional[float] = None
    is_warmup: bool = False
    is_failure: bool = False
    notes: Optional[str] = None

class ExerciseSetResponse(BaseModel):
    id: str
    set_number: int
    reps_completed: int
    weight_kg: float
    rpe: Optional[float]
    is_warmup: bool
    is_failure: bool
    is_pr: bool = False
    completed_at: datetime
    notes: Optional[str]

class SessionExerciseCreate(BaseModel):
    exercise_id: str
    exercise_order: int

class SessionExerciseResponse(BaseModel):
    id: str
    exercise_id: str
    exercise_name: str
    exercise_order: int
    sets: List[ExerciseSetResponse] = []
    completed_at: Optional[datetime]

class WorkoutSessionCreate(BaseModel):
    routine_id: Optional[str] = None
    notes: Optional[str] = None

class WorkoutSessionResponse(BaseModel):
    id: str
    user_id: str
    routine_id: Optional[str]
    routine_name: Optional[str]
    session_date: datetime
    start_time: datetime
    end_time: Optional[datetime]
    duration_minutes: Optional[int]
    total_volume_kg: float = 0
    total_sets: int = 0
    total_reps: int = 0
    is_completed: bool = False
    notes: Optional[str]
    exercises: List[SessionExerciseResponse] = []

class AddSetToSession(BaseModel):
    exercise_id: str
    set_data: ExerciseSetCreate

# Progress Models
class PersonalRecordResponse(BaseModel):
    id: str
    exercise_id: str
    exercise_name: str
    pr_type: str  # ONE_REP_MAX, TOTAL_VOLUME, MAX_REPS, MAX_WEIGHT
    value: float
    reps: Optional[int]
    achieved_at: datetime

class DashboardStats(BaseModel):
    current_streak_days: int
    longest_streak_days: int
    total_volume_kg: float
    workouts_this_month: int
    prs_this_month: int
    account_level: str
    recent_sessions: List[WorkoutSessionResponse] = []

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    user_dict = {
        "email": user_data.email,
        "username": user_data.username,
        "password_hash": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "account_level": "Novice",
        "total_volume_kg": 0,
        "current_streak_days": 0,
        "longest_streak_days": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "last_login_at": datetime.utcnow(),
        "is_active": True
    }
    
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    
    # Create token
    token = create_access_token({"user_id": str(result.inserted_id)})
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=str(result.inserted_id),
            email=user_dict["email"],
            username=user_dict["username"],
            full_name=user_dict["full_name"],
            account_level=user_dict["account_level"],
            total_volume_kg=user_dict["total_volume_kg"],
            current_streak_days=user_dict["current_streak_days"],
            longest_streak_days=user_dict["longest_streak_days"],
            created_at=user_dict["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Update last login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login_at": datetime.utcnow()}}
    )
    
    # Create token
    token = create_access_token({"user_id": str(user["_id"])})
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            username=user["username"],
            full_name=user.get("full_name"),
            account_level=user.get("account_level", "Novice"),
            total_volume_kg=user.get("total_volume_kg", 0),
            current_streak_days=user.get("current_streak_days", 0),
            longest_streak_days=user.get("longest_streak_days", 0),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        username=current_user["username"],
        full_name=current_user.get("full_name"),
        account_level=current_user.get("account_level", "Novice"),
        total_volume_kg=current_user.get("total_volume_kg", 0),
        current_streak_days=current_user.get("current_streak_days", 0),
        longest_streak_days=current_user.get("longest_streak_days", 0),
        created_at=current_user["created_at"]
    )

# ==================== EXERCISES ENDPOINTS ====================

@api_router.get("/exercises", response_model=List[ExerciseResponse])
async def get_exercises(
    muscle: Optional[str] = None,
    equipment: Optional[str] = None,
    pattern: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    query = {}
    if muscle:
        query["muscle"] = {"$regex": muscle, "$options": "i"}
    if equipment:
        query["equipment"] = {"$regex": equipment, "$options": "i"}
    if pattern:
        query["pattern"] = {"$regex": pattern, "$options": "i"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"muscle": {"$regex": search, "$options": "i"}},
            {"equipment": {"$regex": search, "$options": "i"}}
        ]
    
    exercises = await db.exercises.find(query).skip(skip).limit(limit).to_list(limit)
    return [
        ExerciseResponse(
            id=str(ex["_id"]),
            name=ex["name"],
            muscle=ex["muscle"],
            exercise_type=ex.get("exercise_type", ""),
            pattern=ex.get("pattern", ""),
            equipment=ex.get("equipment", ""),
            subtype=ex.get("subtype"),
            notes=ex.get("notes")
        )
        for ex in exercises
    ]

@api_router.get("/exercises/muscles", response_model=List[str])
async def get_muscle_groups():
    muscles = await db.exercises.distinct("muscle")
    return muscles

@api_router.get("/exercises/equipment", response_model=List[str])
async def get_equipment_types():
    equipment = await db.exercises.distinct("equipment")
    return equipment

@api_router.get("/exercises/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise(exercise_id: str):
    exercise = await db.exercises.find_one({"_id": ObjectId(exercise_id)})
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ExerciseResponse(
        id=str(exercise["_id"]),
        name=exercise["name"],
        muscle=exercise["muscle"],
        exercise_type=exercise.get("exercise_type", ""),
        pattern=exercise.get("pattern", ""),
        equipment=exercise.get("equipment", ""),
        subtype=exercise.get("subtype"),
        notes=exercise.get("notes")
    )

# ==================== ROUTINES ENDPOINTS ====================

@api_router.post("/routines", response_model=RoutineResponse)
async def create_routine(
    routine_data: RoutineCreate,
    current_user: dict = Depends(get_current_user)
):
    routine_dict = {
        "user_id": str(current_user["_id"]),
        "name": routine_data.name,
        "description": routine_data.description,
        "routine_type": routine_data.routine_type,
        "difficulty_level": routine_data.difficulty_level,
        "times_completed": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_archived": False
    }
    
    result = await db.routines.insert_one(routine_dict)
    routine_id = str(result.inserted_id)
    
    # Add exercises to routine
    exercises_response = []
    for ex in routine_data.exercises:
        exercise = await db.exercises.find_one({"_id": ObjectId(ex.exercise_id)})
        if not exercise:
            continue
        
        routine_exercise = {
            "routine_id": routine_id,
            "exercise_id": ex.exercise_id,
            "exercise_order": ex.exercise_order,
            "sets_planned": ex.sets_planned,
            "reps_planned": ex.reps_planned,
            "reps_min": ex.reps_min,
            "reps_max": ex.reps_max,
            "target_weight_kg": ex.target_weight_kg,
            "rest_seconds": ex.rest_seconds,
            "notes": ex.notes,
            "created_at": datetime.utcnow()
        }
        
        ex_result = await db.routine_exercises.insert_one(routine_exercise)
        exercises_response.append(RoutineExerciseResponse(
            id=str(ex_result.inserted_id),
            exercise_id=ex.exercise_id,
            exercise_name=exercise["name"],
            exercise_order=ex.exercise_order,
            sets_planned=ex.sets_planned,
            reps_planned=ex.reps_planned,
            reps_min=ex.reps_min,
            reps_max=ex.reps_max,
            target_weight_kg=ex.target_weight_kg,
            rest_seconds=ex.rest_seconds,
            notes=ex.notes
        ))
    
    return RoutineResponse(
        id=routine_id,
        user_id=str(current_user["_id"]),
        name=routine_data.name,
        description=routine_data.description,
        routine_type=routine_data.routine_type,
        difficulty_level=routine_data.difficulty_level,
        times_completed=0,
        exercises=exercises_response,
        created_at=routine_dict["created_at"],
        updated_at=routine_dict["updated_at"]
    )

@api_router.get("/routines", response_model=List[RoutineResponse])
async def get_routines(current_user: dict = Depends(get_current_user)):
    routines = await db.routines.find({
        "user_id": str(current_user["_id"]),
        "is_archived": {"$ne": True}
    }).to_list(100)
    
    result = []
    for routine in routines:
        # Get exercises for this routine
        exercises = await db.routine_exercises.find({
            "routine_id": str(routine["_id"])
        }).sort("exercise_order", 1).to_list(50)
        
        exercises_response = []
        for ex in exercises:
            exercise = await db.exercises.find_one({"_id": ObjectId(ex["exercise_id"])})
            exercise_name = exercise["name"] if exercise else "Unknown"
            exercises_response.append(RoutineExerciseResponse(
                id=str(ex["_id"]),
                exercise_id=ex["exercise_id"],
                exercise_name=exercise_name,
                exercise_order=ex["exercise_order"],
                sets_planned=ex["sets_planned"],
                reps_planned=ex.get("reps_planned"),
                reps_min=ex.get("reps_min"),
                reps_max=ex.get("reps_max"),
                target_weight_kg=ex.get("target_weight_kg"),
                rest_seconds=ex.get("rest_seconds", 90),
                notes=ex.get("notes")
            ))
        
        result.append(RoutineResponse(
            id=str(routine["_id"]),
            user_id=routine["user_id"],
            name=routine["name"],
            description=routine.get("description"),
            routine_type=routine["routine_type"],
            difficulty_level=routine.get("difficulty_level", "Intermediate"),
            times_completed=routine.get("times_completed", 0),
            exercises=exercises_response,
            created_at=routine["created_at"],
            updated_at=routine["updated_at"]
        ))
    
    return result

@api_router.get("/routines/{routine_id}", response_model=RoutineResponse)
async def get_routine(routine_id: str, current_user: dict = Depends(get_current_user)):
    routine = await db.routines.find_one({
        "_id": ObjectId(routine_id),
        "user_id": str(current_user["_id"])
    })
    
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    
    # Get exercises
    exercises = await db.routine_exercises.find({
        "routine_id": routine_id
    }).sort("exercise_order", 1).to_list(50)
    
    exercises_response = []
    for ex in exercises:
        exercise = await db.exercises.find_one({"_id": ObjectId(ex["exercise_id"])})
        exercise_name = exercise["name"] if exercise else "Unknown"
        exercises_response.append(RoutineExerciseResponse(
            id=str(ex["_id"]),
            exercise_id=ex["exercise_id"],
            exercise_name=exercise_name,
            exercise_order=ex["exercise_order"],
            sets_planned=ex["sets_planned"],
            reps_planned=ex.get("reps_planned"),
            reps_min=ex.get("reps_min"),
            reps_max=ex.get("reps_max"),
            target_weight_kg=ex.get("target_weight_kg"),
            rest_seconds=ex.get("rest_seconds", 90),
            notes=ex.get("notes")
        ))
    
    return RoutineResponse(
        id=str(routine["_id"]),
        user_id=routine["user_id"],
        name=routine["name"],
        description=routine.get("description"),
        routine_type=routine["routine_type"],
        difficulty_level=routine.get("difficulty_level", "Intermediate"),
        times_completed=routine.get("times_completed", 0),
        exercises=exercises_response,
        created_at=routine["created_at"],
        updated_at=routine["updated_at"]
    )

@api_router.put("/routines/{routine_id}", response_model=RoutineResponse)
async def update_routine(
    routine_id: str,
    update_data: RoutineUpdate,
    current_user: dict = Depends(get_current_user)
):
    routine = await db.routines.find_one({
        "_id": ObjectId(routine_id),
        "user_id": str(current_user["_id"])
    })
    
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    
    update_dict = {"updated_at": datetime.utcnow()}
    if update_data.name is not None:
        update_dict["name"] = update_data.name
    if update_data.description is not None:
        update_dict["description"] = update_data.description
    if update_data.routine_type is not None:
        update_dict["routine_type"] = update_data.routine_type
    if update_data.difficulty_level is not None:
        update_dict["difficulty_level"] = update_data.difficulty_level
    
    await db.routines.update_one(
        {"_id": ObjectId(routine_id)},
        {"$set": update_dict}
    )
    
    return await get_routine(routine_id, current_user)

@api_router.delete("/routines/{routine_id}")
async def delete_routine(routine_id: str, current_user: dict = Depends(get_current_user)):
    routine = await db.routines.find_one({
        "_id": ObjectId(routine_id),
        "user_id": str(current_user["_id"])
    })
    
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    
    # Archive instead of delete (preserve history)
    await db.routines.update_one(
        {"_id": ObjectId(routine_id)},
        {"$set": {"is_archived": True, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Routine deleted successfully"}

@api_router.post("/routines/{routine_id}/exercises", response_model=RoutineExerciseResponse)
async def add_exercise_to_routine(
    routine_id: str,
    exercise_data: RoutineExerciseCreate,
    current_user: dict = Depends(get_current_user)
):
    routine = await db.routines.find_one({
        "_id": ObjectId(routine_id),
        "user_id": str(current_user["_id"])
    })
    
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    
    exercise = await db.exercises.find_one({"_id": ObjectId(exercise_data.exercise_id)})
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    routine_exercise = {
        "routine_id": routine_id,
        "exercise_id": exercise_data.exercise_id,
        "exercise_order": exercise_data.exercise_order,
        "sets_planned": exercise_data.sets_planned,
        "reps_planned": exercise_data.reps_planned,
        "reps_min": exercise_data.reps_min,
        "reps_max": exercise_data.reps_max,
        "target_weight_kg": exercise_data.target_weight_kg,
        "rest_seconds": exercise_data.rest_seconds,
        "notes": exercise_data.notes,
        "created_at": datetime.utcnow()
    }
    
    result = await db.routine_exercises.insert_one(routine_exercise)
    
    return RoutineExerciseResponse(
        id=str(result.inserted_id),
        exercise_id=exercise_data.exercise_id,
        exercise_name=exercise["name"],
        exercise_order=exercise_data.exercise_order,
        sets_planned=exercise_data.sets_planned,
        reps_planned=exercise_data.reps_planned,
        reps_min=exercise_data.reps_min,
        reps_max=exercise_data.reps_max,
        target_weight_kg=exercise_data.target_weight_kg,
        rest_seconds=exercise_data.rest_seconds,
        notes=exercise_data.notes
    )

@api_router.delete("/routines/{routine_id}/exercises/{exercise_id}")
async def remove_exercise_from_routine(
    routine_id: str,
    exercise_id: str,
    current_user: dict = Depends(get_current_user)
):
    routine = await db.routines.find_one({
        "_id": ObjectId(routine_id),
        "user_id": str(current_user["_id"])
    })
    
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    
    result = await db.routine_exercises.delete_one({
        "_id": ObjectId(exercise_id),
        "routine_id": routine_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Exercise not found in routine")
    
    return {"message": "Exercise removed from routine"}

# ==================== WORKOUT SESSION ENDPOINTS ====================

@api_router.post("/sessions", response_model=WorkoutSessionResponse)
async def start_workout_session(
    session_data: WorkoutSessionCreate,
    current_user: dict = Depends(get_current_user)
):
    routine = None
    routine_name = None
    
    if session_data.routine_id:
        routine = await db.routines.find_one({
            "_id": ObjectId(session_data.routine_id),
            "user_id": str(current_user["_id"])
        })
        if routine:
            routine_name = routine["name"]
    
    session_dict = {
        "user_id": str(current_user["_id"]),
        "routine_id": session_data.routine_id,
        "session_date": datetime.utcnow(),
        "start_time": datetime.utcnow(),
        "end_time": None,
        "duration_minutes": None,
        "total_volume_kg": 0,
        "total_sets": 0,
        "total_reps": 0,
        "is_completed": False,
        "notes": session_data.notes,
        "created_at": datetime.utcnow()
    }
    
    result = await db.workout_sessions.insert_one(session_dict)
    
    return WorkoutSessionResponse(
        id=str(result.inserted_id),
        user_id=str(current_user["_id"]),
        routine_id=session_data.routine_id,
        routine_name=routine_name,
        session_date=session_dict["session_date"],
        start_time=session_dict["start_time"],
        end_time=None,
        duration_minutes=None,
        total_volume_kg=0,
        total_sets=0,
        total_reps=0,
        is_completed=False,
        notes=session_data.notes,
        exercises=[]
    )

@api_router.post("/sessions/{session_id}/sets", response_model=ExerciseSetResponse)
async def add_set_to_session(
    session_id: str,
    set_data: AddSetToSession,
    current_user: dict = Depends(get_current_user)
):
    # Verify session exists and belongs to user
    session = await db.workout_sessions.find_one({
        "_id": ObjectId(session_id),
        "user_id": str(current_user["_id"])
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.get("is_completed"):
        raise HTTPException(status_code=400, detail="Session already completed")
    
    # Get or create session exercise
    session_exercise = await db.session_exercises.find_one({
        "session_id": session_id,
        "exercise_id": set_data.exercise_id
    })
    
    if not session_exercise:
        # Get exercise details
        exercise = await db.exercises.find_one({"_id": ObjectId(set_data.exercise_id)})
        if not exercise:
            raise HTTPException(status_code=404, detail="Exercise not found")
        
        # Get current exercise count for order
        exercise_count = await db.session_exercises.count_documents({"session_id": session_id})
        
        session_exercise = {
            "session_id": session_id,
            "exercise_id": set_data.exercise_id,
            "exercise_order": exercise_count + 1,
            "completed_at": None,
            "notes": None
        }
        result = await db.session_exercises.insert_one(session_exercise)
        session_exercise["_id"] = result.inserted_id
    
    # Calculate volume for this set
    set_volume = set_data.set_data.weight_kg * set_data.set_data.reps_completed
    
    # Check for PR
    is_pr = False
    if not set_data.set_data.is_warmup:
        # Check if this is a new max weight for this exercise
        existing_pr = await db.personal_records.find_one({
            "user_id": str(current_user["_id"]),
            "exercise_id": set_data.exercise_id,
            "pr_type": "MAX_WEIGHT"
        })
        
        if not existing_pr or set_data.set_data.weight_kg > existing_pr.get("value", 0):
            is_pr = True
            # Update or create PR
            await db.personal_records.update_one(
                {
                    "user_id": str(current_user["_id"]),
                    "exercise_id": set_data.exercise_id,
                    "pr_type": "MAX_WEIGHT"
                },
                {
                    "$set": {
                        "value": set_data.set_data.weight_kg,
                        "reps": set_data.set_data.reps_completed,
                        "session_id": session_id,
                        "achieved_at": datetime.utcnow(),
                        "previous_pr_value": existing_pr.get("value") if existing_pr else None
                    }
                },
                upsert=True
            )
    
    # Create the set
    exercise_set = {
        "session_exercise_id": str(session_exercise["_id"]),
        "session_id": session_id,
        "exercise_id": set_data.exercise_id,
        "set_number": set_data.set_data.set_number,
        "reps_completed": set_data.set_data.reps_completed,
        "weight_kg": set_data.set_data.weight_kg,
        "rpe": set_data.set_data.rpe,
        "is_warmup": set_data.set_data.is_warmup,
        "is_failure": set_data.set_data.is_failure,
        "is_pr": is_pr,
        "completed_at": datetime.utcnow(),
        "notes": set_data.set_data.notes
    }
    
    result = await db.exercise_sets.insert_one(exercise_set)
    
    # Update session totals (only for working sets, not warmups)
    if not set_data.set_data.is_warmup:
        await db.workout_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$inc": {
                    "total_volume_kg": set_volume,
                    "total_sets": 1,
                    "total_reps": set_data.set_data.reps_completed
                }
            }
        )
    
    return ExerciseSetResponse(
        id=str(result.inserted_id),
        set_number=set_data.set_data.set_number,
        reps_completed=set_data.set_data.reps_completed,
        weight_kg=set_data.set_data.weight_kg,
        rpe=set_data.set_data.rpe,
        is_warmup=set_data.set_data.is_warmup,
        is_failure=set_data.set_data.is_failure,
        is_pr=is_pr,
        completed_at=exercise_set["completed_at"],
        notes=set_data.set_data.notes
    )

@api_router.post("/sessions/{session_id}/complete", response_model=WorkoutSessionResponse)
async def complete_workout_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    session = await db.workout_sessions.find_one({
        "_id": ObjectId(session_id),
        "user_id": str(current_user["_id"])
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.get("is_completed"):
        raise HTTPException(status_code=400, detail="Session already completed")
    
    # Calculate duration
    end_time = datetime.utcnow()
    start_time = session["start_time"]
    duration = int((end_time - start_time).total_seconds() / 60)
    
    # Update session
    await db.workout_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$set": {
                "end_time": end_time,
                "duration_minutes": duration,
                "is_completed": True
            }
        }
    )
    
    # Update user's total volume and streak
    total_volume = session.get("total_volume_kg", 0)
    
    # Get user's last workout date
    last_session = await db.workout_sessions.find_one(
        {
            "user_id": str(current_user["_id"]),
            "is_completed": True,
            "_id": {"$ne": ObjectId(session_id)}
        },
        sort=[("session_date", -1)]
    )
    
    current_streak = current_user.get("current_streak_days", 0)
    longest_streak = current_user.get("longest_streak_days", 0)
    
    if last_session:
        last_date = last_session["session_date"].date()
        today = datetime.utcnow().date()
        days_diff = (today - last_date).days
        
        if days_diff == 1:
            current_streak += 1
        elif days_diff > 1:
            current_streak = 1
        # If same day, don't change streak
    else:
        current_streak = 1
    
    if current_streak > longest_streak:
        longest_streak = current_streak
    
    # Update routine times_completed
    if session.get("routine_id"):
        await db.routines.update_one(
            {"_id": ObjectId(session["routine_id"])},
            {"$inc": {"times_completed": 1}}
        )
    
    # Update user stats
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$inc": {"total_volume_kg": total_volume},
            "$set": {
                "current_streak_days": current_streak,
                "longest_streak_days": longest_streak,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Calculate new account level
    new_total = current_user.get("total_volume_kg", 0) + total_volume
    new_level = "Novice"
    if new_total >= 500000:
        new_level = "Elite"
    elif new_total >= 150000:
        new_level = "Advanced"
    elif new_total >= 50000:
        new_level = "Intermediate"
    elif new_total >= 10000:
        new_level = "Beginner"
    
    if new_level != current_user.get("account_level", "Novice"):
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"account_level": new_level}}
        )
    
    return await get_session(session_id, current_user)

@api_router.get("/sessions/{session_id}", response_model=WorkoutSessionResponse)
async def get_session(session_id: str, current_user: dict = Depends(get_current_user)):
    session = await db.workout_sessions.find_one({
        "_id": ObjectId(session_id),
        "user_id": str(current_user["_id"])
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get routine name if exists
    routine_name = None
    if session.get("routine_id"):
        routine = await db.routines.find_one({"_id": ObjectId(session["routine_id"])})
        if routine:
            routine_name = routine["name"]
    
    # Get exercises and sets
    session_exercises = await db.session_exercises.find({
        "session_id": session_id
    }).sort("exercise_order", 1).to_list(50)
    
    exercises_response = []
    for se in session_exercises:
        exercise = await db.exercises.find_one({"_id": ObjectId(se["exercise_id"])})
        exercise_name = exercise["name"] if exercise else "Unknown"
        
        # Get sets for this exercise
        sets = await db.exercise_sets.find({
            "session_exercise_id": str(se["_id"])
        }).sort("set_number", 1).to_list(20)
        
        sets_response = [
            ExerciseSetResponse(
                id=str(s["_id"]),
                set_number=s["set_number"],
                reps_completed=s["reps_completed"],
                weight_kg=s["weight_kg"],
                rpe=s.get("rpe"),
                is_warmup=s.get("is_warmup", False),
                is_failure=s.get("is_failure", False),
                is_pr=s.get("is_pr", False),
                completed_at=s["completed_at"],
                notes=s.get("notes")
            )
            for s in sets
        ]
        
        exercises_response.append(SessionExerciseResponse(
            id=str(se["_id"]),
            exercise_id=se["exercise_id"],
            exercise_name=exercise_name,
            exercise_order=se["exercise_order"],
            sets=sets_response,
            completed_at=se.get("completed_at")
        ))
    
    return WorkoutSessionResponse(
        id=str(session["_id"]),
        user_id=session["user_id"],
        routine_id=session.get("routine_id"),
        routine_name=routine_name,
        session_date=session["session_date"],
        start_time=session["start_time"],
        end_time=session.get("end_time"),
        duration_minutes=session.get("duration_minutes"),
        total_volume_kg=session.get("total_volume_kg", 0),
        total_sets=session.get("total_sets", 0),
        total_reps=session.get("total_reps", 0),
        is_completed=session.get("is_completed", False),
        notes=session.get("notes"),
        exercises=exercises_response
    )

@api_router.get("/sessions", response_model=List[WorkoutSessionResponse])
async def get_sessions(
    limit: int = 20,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    sessions = await db.workout_sessions.find({
        "user_id": str(current_user["_id"])
    }).sort("session_date", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for session in sessions:
        routine_name = None
        if session.get("routine_id"):
            routine = await db.routines.find_one({"_id": ObjectId(session["routine_id"])})
            if routine:
                routine_name = routine["name"]
        
        result.append(WorkoutSessionResponse(
            id=str(session["_id"]),
            user_id=session["user_id"],
            routine_id=session.get("routine_id"),
            routine_name=routine_name,
            session_date=session["session_date"],
            start_time=session["start_time"],
            end_time=session.get("end_time"),
            duration_minutes=session.get("duration_minutes"),
            total_volume_kg=session.get("total_volume_kg", 0),
            total_sets=session.get("total_sets", 0),
            total_reps=session.get("total_reps", 0),
            is_completed=session.get("is_completed", False),
            notes=session.get("notes"),
            exercises=[]
        ))
    
    return result

# Get active (in-progress) session
@api_router.get("/sessions/active/current", response_model=Optional[WorkoutSessionResponse])
async def get_active_session(current_user: dict = Depends(get_current_user)):
    session = await db.workout_sessions.find_one({
        "user_id": str(current_user["_id"]),
        "is_completed": False
    })
    
    if not session:
        return None
    
    return await get_session(str(session["_id"]), current_user)

# ==================== PROGRESS & STATS ENDPOINTS ====================

@api_router.get("/progress/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    # Get workouts this month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    workouts_this_month = await db.workout_sessions.count_documents({
        "user_id": user_id,
        "is_completed": True,
        "session_date": {"$gte": start_of_month}
    })
    
    # Get PRs this month
    prs_this_month = await db.personal_records.count_documents({
        "user_id": user_id,
        "achieved_at": {"$gte": start_of_month}
    })
    
    # Get recent sessions
    recent_sessions = await db.workout_sessions.find({
        "user_id": user_id,
        "is_completed": True
    }).sort("session_date", -1).limit(5).to_list(5)
    
    recent_response = []
    for session in recent_sessions:
        routine_name = None
        if session.get("routine_id"):
            routine = await db.routines.find_one({"_id": ObjectId(session["routine_id"])})
            if routine:
                routine_name = routine["name"]
        
        recent_response.append(WorkoutSessionResponse(
            id=str(session["_id"]),
            user_id=session["user_id"],
            routine_id=session.get("routine_id"),
            routine_name=routine_name,
            session_date=session["session_date"],
            start_time=session["start_time"],
            end_time=session.get("end_time"),
            duration_minutes=session.get("duration_minutes"),
            total_volume_kg=session.get("total_volume_kg", 0),
            total_sets=session.get("total_sets", 0),
            total_reps=session.get("total_reps", 0),
            is_completed=True,
            notes=session.get("notes"),
            exercises=[]
        ))
    
    return DashboardStats(
        current_streak_days=current_user.get("current_streak_days", 0),
        longest_streak_days=current_user.get("longest_streak_days", 0),
        total_volume_kg=current_user.get("total_volume_kg", 0),
        workouts_this_month=workouts_this_month,
        prs_this_month=prs_this_month,
        account_level=current_user.get("account_level", "Novice"),
        recent_sessions=recent_response
    )

@api_router.get("/progress/prs", response_model=List[PersonalRecordResponse])
async def get_personal_records(current_user: dict = Depends(get_current_user)):
    prs = await db.personal_records.find({
        "user_id": str(current_user["_id"])
    }).sort("achieved_at", -1).to_list(100)
    
    result = []
    for pr in prs:
        exercise = await db.exercises.find_one({"_id": ObjectId(pr["exercise_id"])})
        exercise_name = exercise["name"] if exercise else "Unknown"
        
        result.append(PersonalRecordResponse(
            id=str(pr["_id"]),
            exercise_id=pr["exercise_id"],
            exercise_name=exercise_name,
            pr_type=pr["pr_type"],
            value=pr["value"],
            reps=pr.get("reps"),
            achieved_at=pr["achieved_at"]
        ))
    
    return result

@api_router.get("/progress/exercise/{exercise_id}/history")
async def get_exercise_history(
    exercise_id: str,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    sets = await db.exercise_sets.find({
        "exercise_id": exercise_id,
        "session_id": {"$in": [str(s["_id"]) for s in await db.workout_sessions.find({"user_id": str(current_user["_id"])}).to_list(1000)]}
    }).sort("completed_at", -1).limit(limit).to_list(limit)
    
    return [
        {
            "id": str(s["_id"]),
            "set_number": s["set_number"],
            "reps_completed": s["reps_completed"],
            "weight_kg": s["weight_kg"],
            "rpe": s.get("rpe"),
            "is_pr": s.get("is_pr", False),
            "completed_at": s["completed_at"]
        }
        for s in sets
    ]

# ==================== SEED EXERCISES ====================

@api_router.post("/admin/seed-exercises")
async def seed_exercises():
    """Seed the exercise database with the encyclopedia data"""
    # Check if already seeded
    count = await db.exercises.count_documents({})
    if count > 0:
        return {"message": f"Database already has {count} exercises"}
    
    # Exercise data from the encyclopedia
    exercises_data = [
        {"muscle": "Espalda", "name": "Pull-up", "exercise_type": "Tirón vertical", "pattern": "Peso corporal", "equipment": "Barra fija/anillas", "subtype": "Prono, ancho, medio, estrecho; sin lastre"},
        {"muscle": "Espalda", "name": "Weighted pull-up", "exercise_type": "Tirón vertical", "pattern": "Peso corporal + lastre", "equipment": "Cinturón, chaleco", "subtype": "Igual que pull-up con peso adicional"},
        {"muscle": "Espalda", "name": "Chin-up", "exercise_type": "Tirón vertical", "pattern": "Peso corporal", "equipment": "Barra fija", "subtype": "Supino, ancho/estrecho"},
        {"muscle": "Espalda", "name": "Lat pulldown wide grip", "exercise_type": "Tirón vertical", "pattern": "Polea", "equipment": "Lat machine", "subtype": "Agarres ancho, prono"},
        {"muscle": "Espalda", "name": "Lat pulldown close/neutral", "exercise_type": "Tirón vertical", "pattern": "Polea", "equipment": "Lat machine", "subtype": "Barra V/neutral"},
        {"muscle": "Espalda", "name": "Barbell bent-over row", "exercise_type": "Tirón horizontal", "pattern": "Barra", "equipment": "Libre", "subtype": "Tronco inclinado, agarre prono"},
        {"muscle": "Espalda", "name": "One-arm dumbbell row", "exercise_type": "Tirón horizontal", "pattern": "Mancuerna", "equipment": "Banco", "subtype": "Clásico en banco con apoyo"},
        {"muscle": "Espalda", "name": "Seated cable row (V-bar)", "exercise_type": "Tirón horizontal", "pattern": "Polea", "equipment": "Polea baja", "subtype": "Agarre neutro estrecho"},
        {"muscle": "Espalda", "name": "Deadlift convencional", "exercise_type": "Bisagra", "pattern": "Barra", "equipment": "Libre", "subtype": "Dorsales, erectores, trapecio"},
        {"muscle": "Espalda", "name": "Face pull", "exercise_type": "Tirón alto", "pattern": "Polea", "equipment": "Polea media/alta", "subtype": "Deltoide posterior + trapecio"},
        
        {"muscle": "Pecho", "name": "Bench press (flat)", "exercise_type": "Empuje horizontal", "pattern": "Barra", "equipment": "Banco plano", "subtype": "Pectoral esternal (medio/inferior)"},
        {"muscle": "Pecho", "name": "Incline bench press", "exercise_type": "Empuje horizontal inclinado", "pattern": "Barra", "equipment": "Banco inclinado", "subtype": "Énfasis pectoral superior (clavicular)"},
        {"muscle": "Pecho", "name": "Decline bench press", "exercise_type": "Empuje horizontal declinado", "pattern": "Barra", "equipment": "Banco declinado", "subtype": "Más pectoral inferior"},
        {"muscle": "Pecho", "name": "DB bench press (flat)", "exercise_type": "Empuje horizontal", "pattern": "Mancuernas", "equipment": "Banco plano", "subtype": "Mayor rango que barra"},
        {"muscle": "Pecho", "name": "DB incline bench press", "exercise_type": "Empuje horizontal inclinado", "pattern": "Mancuernas", "equipment": "Banco inclinado", "subtype": "Pectoral superior"},
        {"muscle": "Pecho", "name": "Push-up", "exercise_type": "Empuje horizontal", "pattern": "Peso corporal", "equipment": "Suelo", "subtype": "Clásico; medio/inferior según ángulo"},
        {"muscle": "Pecho", "name": "Chest dip", "exercise_type": "Empuje vertical / diagonal", "pattern": "Peso corporal", "equipment": "Barras paralelas", "subtype": "Inclinando torso adelante, énfasis pectoral inferior"},
        {"muscle": "Pecho", "name": "Cable crossover (classic)", "exercise_type": "Apertura horizontal", "pattern": "Polea", "equipment": "Dos poleas", "subtype": "Desde alto a bajo o medio; muy usado"},
        {"muscle": "Pecho", "name": "DB fly (flat)", "exercise_type": "Apertura horizontal", "pattern": "Mancuernas", "equipment": "Banco plano", "subtype": "Estiramiento pec esternal"},
        {"muscle": "Pecho", "name": "Pec deck fly (machine)", "exercise_type": "Apertura horizontal", "pattern": "Máquina", "equipment": "Pec-deck", "subtype": "Aislante de pecho"},
        
        {"muscle": "Hombro", "name": "Barbell overhead press (standing)", "exercise_type": "Empuje vertical", "pattern": "Barra", "equipment": "Libre", "subtype": "Press militar clásico"},
        {"muscle": "Hombro", "name": "Seated DB shoulder press", "exercise_type": "Empuje vertical", "pattern": "Mancuernas", "equipment": "Sentado", "subtype": "Variante muy usada"},
        {"muscle": "Hombro", "name": "Arnold press (DB)", "exercise_type": "Empuje vertical", "pattern": "Mancuernas", "equipment": "Sentado/de pie", "subtype": "Rotación interna-externa, mucho anterior"},
        {"muscle": "Hombro", "name": "DB lateral raise (de pie)", "exercise_type": "Abducción", "pattern": "Mancuernas", "equipment": "Libre", "subtype": "Deltoide lateral"},
        {"muscle": "Hombro", "name": "DB front raise", "exercise_type": "Elevación frontal", "pattern": "Mancuernas", "equipment": "Libre", "subtype": "Deltoide anterior"},
        {"muscle": "Hombro", "name": "DB rear delt fly (bent-over)", "exercise_type": "Abducción horizontal", "pattern": "Mancuernas", "equipment": "Tronco inclinado", "subtype": "Clásico posterior"},
        {"muscle": "Hombro", "name": "Cable lateral raise (low pulley)", "exercise_type": "Abducción", "pattern": "Polea", "equipment": "Baja", "subtype": "Excelente tensión continua"},
        
        {"muscle": "Bíceps", "name": "Barbell curl (recta)", "exercise_type": "Flexión codo", "pattern": "Barra", "equipment": "Libre", "subtype": "Curl clásico con barra recta"},
        {"muscle": "Bíceps", "name": "EZ bar curl", "exercise_type": "Flexión codo", "pattern": "Barra EZ", "equipment": "Libre", "subtype": "Mismas mecánicas, menos estrés muñeca"},
        {"muscle": "Bíceps", "name": "Standing DB curl", "exercise_type": "Flexión codo", "pattern": "Mancuernas", "equipment": "Libre", "subtype": "Alterno o simultáneo, supino"},
        {"muscle": "Bíceps", "name": "Hammer curl", "exercise_type": "Flexión codo", "pattern": "Mancuernas", "equipment": "Libre", "subtype": "Agarre neutro (braquiorradial/braquial)"},
        {"muscle": "Bíceps", "name": "Incline DB curl", "exercise_type": "Flexión codo", "pattern": "Mancuernas", "equipment": "Banco inclinado", "subtype": "Mayor estiramiento bíceps"},
        {"muscle": "Bíceps", "name": "Concentration curl", "exercise_type": "Flexión codo", "pattern": "Mancuernas", "equipment": "Sentado", "subtype": "Brazo apoyado en muslo interno"},
        {"muscle": "Bíceps", "name": "Cable curl", "exercise_type": "Flexión codo", "pattern": "Polea", "equipment": "Baja", "subtype": "Barra recta/EZ, de pie"},
        
        {"muscle": "Tríceps", "name": "Close-grip bench press", "exercise_type": "Empuje horizontal", "pattern": "Barra", "equipment": "Banca", "subtype": "Manos estrechas, gran carga para tríceps"},
        {"muscle": "Tríceps", "name": "Lying barbell triceps extension (skullcrusher)", "exercise_type": "Extensión codo", "pattern": "Barra", "equipment": "Banca plana", "subtype": "Flex/extensión codo, barra hacia frente/cabeza"},
        {"muscle": "Tríceps", "name": "Overhead DB triceps extension", "exercise_type": "Extensión codo", "pattern": "Mancuernas", "equipment": "De pie/sentado", "subtype": "Un DB con ambas manos o uno por mano"},
        {"muscle": "Tríceps", "name": "DB kickback", "exercise_type": "Extensión codo", "pattern": "Mancuernas", "equipment": "Banco/de pie", "subtype": "Extensión hacia atrás"},
        {"muscle": "Tríceps", "name": "Triceps pushdown (cable)", "exercise_type": "Extensión codo", "pattern": "Polea", "equipment": "Alta, barra", "subtype": "Clásico de extensión, agarre prono"},
        {"muscle": "Tríceps", "name": "Rope pushdown", "exercise_type": "Extensión codo", "pattern": "Polea", "equipment": "Alta, cuerda", "subtype": "Separa cuerdas al final"},
        {"muscle": "Tríceps", "name": "Parallel bar dip (triceps)", "exercise_type": "Empuje vertical", "pattern": "Peso corporal", "equipment": "Barras paralelas", "subtype": "Tronco más vertical, codos pegados"},
        
        {"muscle": "Cuádriceps", "name": "Back squat", "exercise_type": "Sentadilla", "pattern": "Barra", "equipment": "Rack", "subtype": "Barra alta o baja"},
        {"muscle": "Cuádriceps", "name": "Front squat", "exercise_type": "Sentadilla frontal", "pattern": "Barra", "equipment": "Rack", "subtype": "Más énfasis en cuádriceps"},
        {"muscle": "Cuádriceps", "name": "Goblet squat", "exercise_type": "Sentadilla", "pattern": "Mancuernas/Kettlebell", "equipment": "Cargada frontal", "subtype": "Buen patrón para quad"},
        {"muscle": "Cuádriceps", "name": "Leg extension machine", "exercise_type": "Extensión rodilla", "pattern": "Máquina", "equipment": "Selectorizada", "subtype": "Aíslante de cuádriceps"},
        {"muscle": "Cuádriceps", "name": "45° leg press", "exercise_type": "Prensa piernas", "pattern": "Máquina", "equipment": "Sled 45°", "subtype": "Trabajo global pierna, buen quad"},
        {"muscle": "Cuádriceps", "name": "Hack squat machine", "exercise_type": "Sentadilla guiada", "pattern": "Máquina", "equipment": "Hack", "subtype": "Gran enfoque en cuádriceps según pies"},
        {"muscle": "Cuádriceps", "name": "Walking lunge", "exercise_type": "Zancada", "pattern": "Mancuernas", "equipment": "Libre", "subtype": "Clásico para quad"},
        {"muscle": "Cuádriceps", "name": "Bulgarian split squat", "exercise_type": "Zancada unilateral", "pattern": "Mancuernas", "equipment": "Pie trasero elevado", "subtype": "Muy usado para quad"},
        
        {"muscle": "Isquiotibiales", "name": "Romanian deadlift", "exercise_type": "Bisagra", "pattern": "Barra", "equipment": "Libre", "subtype": "Foco isquios/glúteo y erectores"},
        {"muscle": "Isquiotibiales", "name": "Stiff-leg deadlift", "exercise_type": "Bisagra", "pattern": "Barra", "equipment": "Libre", "subtype": "Piernas casi rectas, más isquios"},
        {"muscle": "Isquiotibiales", "name": "Lying leg curl machine", "exercise_type": "Flexión rodilla", "pattern": "Máquina", "equipment": "Tumbado", "subtype": "Aislante clásico de isquios"},
        {"muscle": "Isquiotibiales", "name": "Seated leg curl machine", "exercise_type": "Flexión rodilla", "pattern": "Máquina", "equipment": "Sentado", "subtype": "Isquios en posición estirada"},
        {"muscle": "Isquiotibiales", "name": "DB Romanian deadlift", "exercise_type": "Bisagra", "pattern": "Mancuernas", "equipment": "Libre", "subtype": "Variante unilateral o bilateral"},
        
        {"muscle": "Glúteo", "name": "Hip thrust (barra)", "exercise_type": "Extensión cadera", "pattern": "Barra", "equipment": "Banco", "subtype": "Máximo glúteo aislado"},
        {"muscle": "Glúteo", "name": "Glute bridge", "exercise_type": "Extensión cadera", "pattern": "Peso corporal", "equipment": "Suelo", "subtype": "Versión básica del hip thrust"},
        {"muscle": "Glúteo", "name": "Cable kickback", "exercise_type": "Extensión cadera", "pattern": "Polea", "equipment": "Baja, tobillera", "subtype": "Patada atrás con cable"},
        {"muscle": "Glúteo", "name": "Hip abduction machine", "exercise_type": "Abducción cadera", "pattern": "Máquina", "equipment": "Selectorizada", "subtype": "Glúteo medio principalmente"},
        
        {"muscle": "Pantorrilla", "name": "Standing calf raise (machine)", "exercise_type": "Flexión plantar", "pattern": "Máquina", "equipment": "Selectorizada", "subtype": "Rodillas extendidas, gastrocnemios"},
        {"muscle": "Pantorrilla", "name": "Seated calf raise machine", "exercise_type": "Flexión plantar", "pattern": "Máquina", "equipment": "Sentado", "subtype": "Rodilla flexionada, más sóleo"},
        {"muscle": "Pantorrilla", "name": "Leg press calf raise", "exercise_type": "Flexión plantar", "pattern": "Máquina", "equipment": "Leg press", "subtype": "Usando la prensa para gemelos"},
        
        {"muscle": "Abdomen", "name": "Crunch", "exercise_type": "Flexión tronco", "pattern": "Peso corporal", "equipment": "Suelo", "subtype": "Recto abdominal superior"},
        {"muscle": "Abdomen", "name": "Plank", "exercise_type": "Anti-extensión", "pattern": "Peso corporal", "equipment": "Suelo", "subtype": "Plancha frontal clásica"},
        {"muscle": "Abdomen", "name": "Hanging leg raise", "exercise_type": "Elevación cadera", "pattern": "Peso corporal", "equipment": "Barra", "subtype": "Piernas rectas, muy demandante"},
        {"muscle": "Abdomen", "name": "Russian twist (BW)", "exercise_type": "Rotación", "pattern": "Peso corporal", "equipment": "Suelo", "subtype": "Oblicuos"},
        {"muscle": "Abdomen", "name": "Cable crunch (kneeling)", "exercise_type": "Flexión tronco", "pattern": "Polea", "equipment": "Polea alta, cuerda", "subtype": "Muy popular para recto"},
        {"muscle": "Abdomen", "name": "Ab wheel rollout", "exercise_type": "Anti-extensión", "pattern": "Peso corporal", "equipment": "Rueda/barra", "subtype": "Muy exigente para core"},
        {"muscle": "Abdomen", "name": "Side plank", "exercise_type": "Anti-flexión lateral", "pattern": "Peso corporal", "equipment": "Suelo", "subtype": "Oblicuos/transverso"},
    ]
    
    # Insert all exercises
    result = await db.exercises.insert_many(exercises_data)
    
    return {"message": f"Seeded {len(result.inserted_ids)} exercises"}

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "ToDoApp Plus - Fitness API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
