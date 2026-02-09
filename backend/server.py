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
import sys
import jwt
import bcrypt
from dotenv import load_dotenv
from loguru import logger

# Import exercise and achievement data from Excel file
from exercises_data import EXERCISES_DATA, ACHIEVEMENTS_DATA

load_dotenv()

# Configure structured logging with loguru
logger.remove()  # Remove default handler
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO",
    colorize=True,
)
logger.add(
    "logs/app_{time:YYYY-MM-DD}.log",
    rotation="00:00",
    retention="30 days",
    compression="zip",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
    level="DEBUG",
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "todoapp_fitness")

# JWT Configuration - REQUIRED
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is required. Please set it in your .env file.")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# MongoDB client
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="ToDoApp Plus - Fitness API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

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
    exercises: Optional[List[RoutineExerciseCreate]] = None

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
    # Planning data from routine (if loaded from routine)
    sets_planned: Optional[int] = None
    reps_planned: Optional[int] = None
    reps_min: Optional[int] = None
    reps_max: Optional[int] = None
    target_weight_kg: Optional[float] = None
    rest_seconds: Optional[int] = None

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

# Task Models
class Subtask(BaseModel):
    id: str
    title: str
    completed: bool = False

class SubtaskCreate(BaseModel):
    title: str

class FitnessMetadata(BaseModel):
    routine_id: Optional[str] = None
    exercise_id: Optional[str] = None
    target_weight: Optional[float] = None
    target_reps: Optional[int] = None
    achievement_code: Optional[str] = None
    workouts_per_week: Optional[int] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"  # low, medium, high, urgent
    status: str = "todo"  # todo, in_progress, completed, cancelled
    due_date: Optional[datetime] = None
    category: Optional[str] = None  # personal, work, fitness, health, shopping, other
    tags: List[str] = []
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # daily, weekly, monthly, custom
    recurrence_days: List[int] = []  # [1,3,5] for Mon, Wed, Fri
    subtasks: List[Subtask] = []
    linked_to_fitness: bool = False
    fitness_link_type: Optional[str] = None  # workout_goal, routine_reminder, pr_goal, achievement_goal
    fitness_metadata: Optional[FitnessMetadata] = None
    reminder_enabled: bool = False
    reminder_time: Optional[datetime] = None
    order: int = 0

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    recurrence_days: Optional[List[int]] = None
    subtasks: Optional[List[Subtask]] = None
    linked_to_fitness: Optional[bool] = None
    fitness_link_type: Optional[str] = None
    fitness_metadata: Optional[FitnessMetadata] = None
    reminder_enabled: Optional[bool] = None
    reminder_time: Optional[datetime] = None
    order: Optional[int] = None

class TaskResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    completed: bool
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    category: Optional[str]
    tags: List[str]
    is_recurring: bool
    recurrence_pattern: Optional[str]
    recurrence_days: List[int]
    subtasks: List[Subtask]
    linked_to_fitness: bool
    fitness_link_type: Optional[str]
    fitness_metadata: Optional[FitnessMetadata]
    reminder_enabled: bool
    reminder_time: Optional[datetime]
    order: int

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

# Reset Password (simplified version without email)
@api_router.post("/auth/reset-password")
async def reset_password(email: str, new_password: str):
    """
    Reset password for a user (simplified - no email verification)
    In production, this should send an email with a reset token
    """
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update password
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password_hash": hash_password(new_password),
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Password reset successfully"}

# ==================== EXERCISES ENDPOINTS ====================

@api_router.get("/exercises", response_model=List[ExerciseResponse])
async def get_exercises(
    muscle: Optional[str] = None,
    equipment: Optional[str] = None,
    pattern: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 500,
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
    
    # Update exercises if provided
    if update_data.exercises is not None:
        # Delete existing routine_exercises
        await db.routine_exercises.delete_many({"routine_id": routine_id})
        
        # Insert new exercises
        for exercise_data in update_data.exercises:
            exercise_doc = await db.exercises.find_one({"_id": ObjectId(exercise_data.exercise_id)})
            if not exercise_doc:
                continue
            
            await db.routine_exercises.insert_one({
                "routine_id": routine_id,
                "exercise_id": exercise_data.exercise_id,
                "exercise_name": exercise_doc["name"],
                "exercise_order": exercise_data.exercise_order,
                "sets_planned": exercise_data.sets_planned,
                "reps_planned": exercise_data.reps_planned,
                "reps_min": exercise_data.reps_min,
                "reps_max": exercise_data.reps_max,
                "target_weight_kg": exercise_data.target_weight_kg,
                "rest_seconds": exercise_data.rest_seconds,
                "notes": exercise_data.notes
            })
    
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
    routine_exercises = []
    
    if session_data.routine_id:
        routine = await db.routines.find_one({
            "_id": ObjectId(session_data.routine_id),
            "user_id": str(current_user["_id"])
        })
        if routine:
            routine_name = routine["name"]
            
            # Load exercises from the routine
            exercises_from_routine = await db.routine_exercises.find({
                "routine_id": session_data.routine_id
            }).sort("exercise_order", 1).to_list(50)
            
            for ex in exercises_from_routine:
                # Get exercise details
                exercise = await db.exercises.find_one({"_id": ObjectId(ex["exercise_id"])})
                if exercise:
                    routine_exercises.append(SessionExerciseResponse(
                        id=str(ex["_id"]),  # Use routine_exercise _id as temporary id
                        exercise_id=ex["exercise_id"],
                        exercise_name=exercise["name"],
                        exercise_order=ex["exercise_order"],
                        sets=[],
                        completed_at=None,
                        # Include planning data
                        sets_planned=ex.get("sets_planned"),
                        reps_planned=ex.get("reps_planned"),
                        reps_min=ex.get("reps_min"),
                        reps_max=ex.get("reps_max"),
                        target_weight_kg=ex.get("target_weight_kg"),
                        rest_seconds=ex.get("rest_seconds", 90)
                    ))
    
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
    
    logger.info(f"Started workout session {result.inserted_id} with {len(routine_exercises)} exercises from routine {session_data.routine_id}")
    
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
        exercises=routine_exercises
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

@api_router.put("/sessions/{session_id}/sets/{set_id}", response_model=ExerciseSetResponse)
async def update_set_in_session(
    session_id: str,
    set_id: str,
    set_data: ExerciseSetCreate,
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
        raise HTTPException(status_code=400, detail="Cannot update sets in completed session")
    
    # Get existing set
    existing_set = await db.exercise_sets.find_one({"_id": ObjectId(set_id)})
    if not existing_set:
        raise HTTPException(status_code=404, detail="Set not found")
    
    # Calculate volume difference for session totals
    old_volume = existing_set["weight_kg"] * existing_set["reps_completed"] if not existing_set.get("is_warmup") else 0
    new_volume = set_data.weight_kg * set_data.reps_completed if not set_data.is_warmup else 0
    volume_diff = new_volume - old_volume
    
    old_reps = existing_set["reps_completed"] if not existing_set.get("is_warmup") else 0
    new_reps = set_data.reps_completed if not set_data.is_warmup else 0
    reps_diff = new_reps - old_reps
    
    # Update the set
    await db.exercise_sets.update_one(
        {"_id": ObjectId(set_id)},
        {
            "$set": {
                "reps_completed": set_data.reps_completed,
                "weight_kg": set_data.weight_kg,
                "rpe": set_data.rpe,
                "is_warmup": set_data.is_warmup,
                "is_failure": set_data.is_failure,
                "notes": set_data.notes
            }
        }
    )
    
    # Update session totals if needed
    if volume_diff != 0 or reps_diff != 0:
        await db.workout_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$inc": {
                    "total_volume_kg": volume_diff,
                    "total_reps": reps_diff
                }
            }
        )
    
    # Get updated set
    updated_set = await db.exercise_sets.find_one({"_id": ObjectId(set_id)})
    
    return ExerciseSetResponse(
        id=str(updated_set["_id"]),
        set_number=updated_set["set_number"],
        reps_completed=updated_set["reps_completed"],
        weight_kg=updated_set["weight_kg"],
        rpe=updated_set.get("rpe"),
        is_warmup=updated_set.get("is_warmup", False),
        is_failure=updated_set.get("is_failure", False),
        is_pr=updated_set.get("is_pr", False),
        completed_at=updated_set["completed_at"],
        notes=updated_set.get("notes")
    )

@api_router.delete("/sessions/{session_id}/sets/{set_id}")
async def delete_set_from_session(
    session_id: str,
    set_id: str,
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
        raise HTTPException(status_code=400, detail="Cannot delete sets from completed session")
    
    # Get existing set
    existing_set = await db.exercise_sets.find_one({"_id": ObjectId(set_id)})
    if not existing_set:
        raise HTTPException(status_code=404, detail="Set not found")
    
    # Calculate volume to subtract (only if not warmup)
    volume_to_subtract = 0
    reps_to_subtract = 0
    if not existing_set.get("is_warmup"):
        volume_to_subtract = existing_set["weight_kg"] * existing_set["reps_completed"]
        reps_to_subtract = existing_set["reps_completed"]
    
    # Delete the set
    await db.exercise_sets.delete_one({"_id": ObjectId(set_id)})
    
    # Update session totals
    if volume_to_subtract > 0 or reps_to_subtract > 0:
        await db.workout_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$inc": {
                    "total_volume_kg": -volume_to_subtract,
                    "total_sets": -1,
                    "total_reps": -reps_to_subtract
                }
            }
        )
    
    logger.info(f"Deleted set {set_id} from session {session_id}")
    
    return {"success": True, "message": "Set deleted successfully"}

@api_router.post("/sessions/{session_id}/exercises")
async def add_exercise_to_session(
    session_id: str,
    exercise_data: SessionExerciseCreate,
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
        raise HTTPException(status_code=400, detail="Cannot add exercises to completed session")
    
    # Verify exercise exists
    exercise = await db.exercises.find_one({"_id": ObjectId(exercise_data.exercise_id)})
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    # Check if exercise already exists in this session
    existing = await db.session_exercises.find_one({
        "session_id": session_id,
        "exercise_id": exercise_data.exercise_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Exercise already in this session")
    
    # Create session exercise
    session_exercise_dict = {
        "session_id": session_id,
        "exercise_id": exercise_data.exercise_id,
        "exercise_order": exercise_data.exercise_order,
        "created_at": datetime.utcnow()
    }
    
    result = await db.session_exercises.insert_one(session_exercise_dict)
    
    logger.info(f"Added exercise {exercise_data.exercise_id} to session {session_id}")
    
    return {
        "id": str(result.inserted_id),
        "exercise_id": exercise_data.exercise_id,
        "exercise_name": exercise["name"],
        "exercise_order": exercise_data.exercise_order
    }

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
    
    # If no session_exercises yet but routine_id exists, load from routine
    if not session_exercises and session.get("routine_id"):
        logger.info(f"No session_exercises found, loading from routine {session.get('routine_id')}")
        routine_exercises = await db.routine_exercises.find({
            "routine_id": session.get("routine_id")
        }).sort("exercise_order", 1).to_list(50)
        
        for rex in routine_exercises:
            exercise = await db.exercises.find_one({"_id": ObjectId(rex["exercise_id"])})
            if exercise:
                exercises_response.append(SessionExerciseResponse(
                    id=str(rex["_id"]),  # Use routine_exercise _id as temporary id
                    exercise_id=rex["exercise_id"],
                    exercise_name=exercise["name"],
                    exercise_order=rex["exercise_order"],
                    sets=[],
                    completed_at=None,
                    # Include planning data
                    sets_planned=rex.get("sets_planned"),
                    reps_planned=rex.get("reps_planned"),
                    reps_min=rex.get("reps_min"),
                    reps_max=rex.get("reps_max"),
                    target_weight_kg=rex.get("target_weight_kg"),
                    rest_seconds=rex.get("rest_seconds", 90)
                ))
    else:
        # Load ALL exercises from routine, merge with session_exercises data
        if session.get("routine_id"):
            routine_exercises = await db.routine_exercises.find({
                "routine_id": session.get("routine_id")
            }).sort("exercise_order", 1).to_list(50)
            
            # Create map of session_exercises by exercise_id
            session_exercises_map = {se["exercise_id"]: se for se in session_exercises}
            
            for rex in routine_exercises:
                exercise = await db.exercises.find_one({"_id": ObjectId(rex["exercise_id"])})
                if not exercise:
                    continue
                
                # Check if this exercise has session_exercises
                se = session_exercises_map.get(rex["exercise_id"])
                
                if se:
                    # Exercise has sets, load them
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
                        exercise_id=rex["exercise_id"],
                        exercise_name=exercise["name"],
                        exercise_order=rex["exercise_order"],
                        sets=sets_response,
                        completed_at=se.get("completed_at"),
                        # Include planning data from routine
                        sets_planned=rex.get("sets_planned"),
                        reps_planned=rex.get("reps_planned"),
                        reps_min=rex.get("reps_min"),
                        reps_max=rex.get("reps_max"),
                        target_weight_kg=rex.get("target_weight_kg"),
                        rest_seconds=rex.get("rest_seconds", 90)
                    ))
                else:
                    # Exercise has no sets yet, return with empty sets
                    exercises_response.append(SessionExerciseResponse(
                        id=str(rex["_id"]),  # Use routine_exercise _id
                        exercise_id=rex["exercise_id"],
                        exercise_name=exercise["name"],
                        exercise_order=rex["exercise_order"],
                        sets=[],
                        completed_at=None,
                        # Include planning data from routine
                        sets_planned=rex.get("sets_planned"),
                        reps_planned=rex.get("reps_planned"),
                        reps_min=rex.get("reps_min"),
                        reps_max=rex.get("reps_max"),
                        target_weight_kg=rex.get("target_weight_kg"),
                        rest_seconds=rex.get("rest_seconds", 90)
                    ))
        else:
            # No routine_id, just load session_exercises
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
    
    logger.info(f"get_session returning {len(exercises_response)} exercises for session {session_id}")
    
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

# Delete/Cancel workout session
@api_router.delete("/sessions/{session_id}")
async def delete_workout_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    session = await db.workout_sessions.find_one({
        "_id": ObjectId(session_id),
        "user_id": str(current_user["_id"])
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Delete all exercise sets for this session
    await db.exercise_sets.delete_many({"session_id": session_id})
    
    # Delete all session exercises
    await db.session_exercises.delete_many({"session_id": session_id})
    
    # Delete the session
    await db.workout_sessions.delete_one({"_id": ObjectId(session_id)})
    
    return {"message": "Workout session deleted successfully"}

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
    """Seed the exercise database with the complete encyclopedia data from Excel"""
    # Check if already seeded
    count = await db.exercises.count_documents({})
    if count > 0:
        return {"message": f"Database already has {count} exercises"}
    
    # Use the complete exercise data imported from exercises_data.py (Excel file)
    result = await db.exercises.insert_many(EXERCISES_DATA)
    
    return {"message": f"Seeded {len(result.inserted_ids)} exercises from Excel encyclopedia"}


@api_router.post("/admin/seed-achievements")
async def seed_achievements():
    """Seed the achievements database"""
    # Check if already seeded
    count = await db.achievements.count_documents({})
    if count > 0:
        return {"message": f"Database already has {count} achievements"}
    
    # Insert all achievements from the data file
    result = await db.achievements.insert_many(ACHIEVEMENTS_DATA)
    
    return {"message": f"Seeded {len(result.inserted_ids)} achievements"}


@api_router.post("/admin/reseed-exercises")
async def reseed_exercises():
    """Force re-seed exercises by deleting existing and inserting new"""
    await db.exercises.delete_many({})
    result = await db.exercises.insert_many(EXERCISES_DATA)
    return {"message": f"Re-seeded {len(result.inserted_ids)} exercises from Excel encyclopedia"}


# ==================== ACHIEVEMENTS ENDPOINTS ====================

@api_router.get("/achievements")
async def get_all_achievements():
    """Get all available achievements"""
    achievements = await db.achievements.find({}).to_list(100)
    return [
        {
            "id": str(a["_id"]),
            "code": a["code"],
            "name": a["name"],
            "description": a["description"],
            "category": a["category"],
            "points": a["points"],
            "rarity": a["rarity"],
            "criteria": a.get("criteria", {})
        }
        for a in achievements
    ]


@api_router.get("/achievements/user")
async def get_user_achievements(current_user: dict = Depends(get_current_user)):
    """Get achievements unlocked by the current user"""
    user_achievements = await db.user_achievements.find({
        "user_id": str(current_user["_id"])
    }).to_list(100)
    
    result = []
    for ua in user_achievements:
        achievement = await db.achievements.find_one({"_id": ObjectId(ua["achievement_id"])})
        if achievement:
            result.append({
                "id": str(ua["_id"]),
                "achievement": {
                    "id": str(achievement["_id"]),
                    "code": achievement["code"],
                    "name": achievement["name"],
                    "description": achievement["description"],
                    "category": achievement["category"],
                    "points": achievement["points"],
                    "rarity": achievement["rarity"]
                },
                "unlocked_at": ua["unlocked_at"]
            })
    
    return result


@api_router.post("/achievements/check")
async def check_and_unlock_achievements(current_user: dict = Depends(get_current_user)):
    """Check user progress and unlock any earned achievements"""
    user_id = str(current_user["_id"])
    newly_unlocked = []
    
    # Get all achievements
    all_achievements = await db.achievements.find({}).to_list(100)
    
    # Get user's current achievements
    user_achievement_ids = [
        ua["achievement_id"] 
        for ua in await db.user_achievements.find({"user_id": user_id}).to_list(100)
    ]
    
    # Get user stats
    total_workouts = await db.workout_sessions.count_documents({
        "user_id": user_id, 
        "is_completed": True
    })
    total_prs = await db.personal_records.count_documents({"user_id": user_id})
    streak = current_user.get("current_streak_days", 0)
    total_volume = current_user.get("total_volume_kg", 0)
    account_level = current_user.get("account_level", "Novice")
    
    for achievement in all_achievements:
        ach_id = str(achievement["_id"])
        
        # Skip if already unlocked
        if ach_id in user_achievement_ids:
            continue
        
        criteria = achievement.get("criteria", {})
        should_unlock = False
        
        # Check criteria
        if "workouts_completed" in criteria and total_workouts >= criteria["workouts_completed"]:
            should_unlock = True
        elif "streak_days" in criteria and streak >= criteria["streak_days"]:
            should_unlock = True
        elif "total_volume" in criteria and total_volume >= criteria["total_volume"]:
            should_unlock = True
        elif "total_prs" in criteria and total_prs >= criteria["total_prs"]:
            should_unlock = True
        elif "account_level" in criteria and account_level == criteria["account_level"]:
            should_unlock = True
        
        if should_unlock:
            await db.user_achievements.insert_one({
                "user_id": user_id,
                "achievement_id": ach_id,
                "unlocked_at": datetime.utcnow()
            })
            newly_unlocked.append({
                "id": ach_id,
                "code": achievement["code"],
                "name": achievement["name"],
                "description": achievement["description"],
                "points": achievement["points"],
                "rarity": achievement["rarity"]
            })
    
    return {
        "newly_unlocked": newly_unlocked,
        "total_unlocked": len(user_achievement_ids) + len(newly_unlocked)
    }

# ==================== TASK ENDPOINTS ====================

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(task_data: TaskCreate, current_user: dict = Depends(get_current_user)):
    """Create a new task"""
    task_dict = {
        "user_id": str(current_user["_id"]),
        "title": task_data.title,
        "description": task_data.description,
        "completed": False,
        "priority": task_data.priority,
        "status": task_data.status,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "due_date": task_data.due_date,
        "completed_at": None,
        "category": task_data.category,
        "tags": task_data.tags,
        "is_recurring": task_data.is_recurring,
        "recurrence_pattern": task_data.recurrence_pattern,
        "recurrence_days": task_data.recurrence_days,
        "subtasks": [s.dict() for s in task_data.subtasks],
        "linked_to_fitness": task_data.linked_to_fitness,
        "fitness_link_type": task_data.fitness_link_type,
        "fitness_metadata": task_data.fitness_metadata.dict() if task_data.fitness_metadata else None,
        "reminder_enabled": task_data.reminder_enabled,
        "reminder_time": task_data.reminder_time,
        "order": task_data.order
    }
    
    result = await db.tasks.insert_one(task_dict)
    task_dict["_id"] = result.inserted_id
    
    logger.info(f"Created task {result.inserted_id} for user {current_user['_id']}")
    
    return TaskResponse(
        id=str(task_dict["_id"]),
        user_id=task_dict["user_id"],
        title=task_dict["title"],
        description=task_dict["description"],
        completed=task_dict["completed"],
        priority=task_dict["priority"],
        status=task_dict["status"],
        created_at=task_dict["created_at"],
        updated_at=task_dict["updated_at"],
        due_date=task_dict["due_date"],
        completed_at=task_dict["completed_at"],
        category=task_dict["category"],
        tags=task_dict["tags"],
        is_recurring=task_dict["is_recurring"],
        recurrence_pattern=task_dict["recurrence_pattern"],
        recurrence_days=task_dict["recurrence_days"],
        subtasks=[Subtask(**s) for s in task_dict["subtasks"]],
        linked_to_fitness=task_dict["linked_to_fitness"],
        fitness_link_type=task_dict["fitness_link_type"],
        fitness_metadata=FitnessMetadata(**task_dict["fitness_metadata"]) if task_dict["fitness_metadata"] else None,
        reminder_enabled=task_dict["reminder_enabled"],
        reminder_time=task_dict["reminder_time"],
        order=task_dict["order"]
    )

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    tags: Optional[str] = None,
    completed: Optional[bool] = None,
    overdue: Optional[bool] = None,
    due_today: Optional[bool] = None,
    due_this_week: Optional[bool] = None,
    linked_to_fitness: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get tasks with advanced filtering"""
    # Build query
    query = {"user_id": str(current_user["_id"])}
    
    # Apply filters
    if status:
        query["status"] = status
    
    if priority:
        query["priority"] = priority
    
    if category:
        query["category"] = category
    
    if tags:
        # Support multiple tags separated by comma
        tag_list = [t.strip() for t in tags.split(",")]
        query["tags"] = {"$in": tag_list}
    
    if completed is not None:
        query["completed"] = completed
    
    if linked_to_fitness is not None:
        query["linked_to_fitness"] = linked_to_fitness
    
    # Date filters
    now = datetime.utcnow()
    
    if overdue:
        query["due_date"] = {"$lt": now, "$ne": None}
        query["completed"] = False
    
    if due_today:
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        query["due_date"] = {"$gte": start_of_day, "$lt": end_of_day}
    
    if due_this_week:
        start_of_week = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_week = start_of_week + timedelta(days=7)
        query["due_date"] = {"$gte": start_of_week, "$lt": end_of_week}
    
    # Search in title and description
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    logger.info(f"Query filters: {query}")
    
    tasks = await db.tasks.find(query).sort("order", 1).to_list(1000)
    
    result = []
    for task in tasks:
        result.append(TaskResponse(
            id=str(task["_id"]),
            user_id=task["user_id"],
            title=task["title"],
            description=task.get("description"),
            completed=task.get("completed", False),
            priority=task.get("priority", "medium"),
            status=task.get("status", "todo"),
            created_at=task["created_at"],
            updated_at=task["updated_at"],
            due_date=task.get("due_date"),
            completed_at=task.get("completed_at"),
            category=task.get("category"),
            tags=task.get("tags", []),
            is_recurring=task.get("is_recurring", False),
            recurrence_pattern=task.get("recurrence_pattern"),
            recurrence_days=task.get("recurrence_days", []),
            subtasks=[Subtask(**s) for s in task.get("subtasks", [])],
            linked_to_fitness=task.get("linked_to_fitness", False),
            fitness_link_type=task.get("fitness_link_type"),
            fitness_metadata=FitnessMetadata(**task["fitness_metadata"]) if task.get("fitness_metadata") else None,
            reminder_enabled=task.get("reminder_enabled", False),
            reminder_time=task.get("reminder_time"),
            order=task.get("order", 0)
        ))
    
    return result

# Task stats endpoint - MUST be before /tasks/{task_id} to avoid route conflict
@api_router.get("/tasks/stats")
async def get_task_stats(current_user: dict = Depends(get_current_user)):
    """Get task statistics for current user"""
    user_id = str(current_user["_id"])
    
    # Total tasks
    total_tasks = await db.tasks.count_documents({"user_id": user_id})
    
    # Completed tasks
    completed_tasks = await db.tasks.count_documents({
        "user_id": user_id,
        "completed": True
    })
    
    # Tasks by priority
    urgent_tasks = await db.tasks.count_documents({
        "user_id": user_id,
        "priority": "urgent",
        "completed": False
    })
    high_tasks = await db.tasks.count_documents({
        "user_id": user_id,
        "priority": "high",
        "completed": False
    })
    medium_tasks = await db.tasks.count_documents({
        "user_id": user_id,
        "priority": "medium",
        "completed": False
    })
    low_tasks = await db.tasks.count_documents({
        "user_id": user_id,
        "priority": "low",
        "completed": False
    })
    
    # Tasks by status
    todo_tasks = await db.tasks.count_documents({
        "user_id": user_id,
        "status": "todo"
    })
    in_progress_tasks = await db.tasks.count_documents({
        "user_id": user_id,
        "status": "in_progress"
    })
    
    # Overdue tasks
    now = datetime.utcnow()
    overdue_tasks = await db.tasks.count_documents({
        "user_id": user_id,
        "completed": False,
        "due_date": {"$lt": now, "$ne": None}
    })
    
    # Due today
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    due_today = await db.tasks.count_documents({
        "user_id": user_id,
        "completed": False,
        "due_date": {"$gte": start_of_day, "$lt": end_of_day}
    })
    
    # Completed today
    completed_today = await db.tasks.count_documents({
        "user_id": user_id,
        "completed_at": {"$gte": start_of_day, "$lt": end_of_day}
    })
    
    # Completed this week
    start_of_week = now - timedelta(days=7)
    completed_this_week = await db.tasks.count_documents({
        "user_id": user_id,
        "completed_at": {"$gte": start_of_week}
    })
    
    # Completed this month
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    completed_this_month = await db.tasks.count_documents({
        "user_id": user_id,
        "completed_at": {"$gte": start_of_month}
    })
    
    # Fitness tasks
    fitness_tasks = await db.tasks.count_documents({
        "user_id": user_id,
        "linked_to_fitness": True
    })
    fitness_tasks_completed = await db.tasks.count_documents({
        "user_id": user_id,
        "linked_to_fitness": True,
        "completed": True
    })
    
    # Completion rate
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Task streak (days in a row completing at least 1 task)
    # Start from yesterday and go backwards
    task_streak = 0
    check_date = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Check if user completed task today first
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_completed = await db.tasks.count_documents({
        "user_id": user_id,
        "completed_at": {"$gte": today_start}
    })
    
    if today_completed > 0:
        task_streak = 1
    
    # Check previous days
    for _ in range(364):  # Max 365 days total including today
        next_day = check_date + timedelta(days=1)
        daily_completed = await db.tasks.count_documents({
            "user_id": user_id,
            "completed_at": {"$gte": check_date, "$lt": next_day}
        })
        if daily_completed > 0:
            task_streak += 1
            check_date -= timedelta(days=1)
        else:
            break
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": total_tasks - completed_tasks,
        "completion_rate": round(completion_rate, 1),
        "by_priority": {
            "urgent": urgent_tasks,
            "high": high_tasks,
            "medium": medium_tasks,
            "low": low_tasks
        },
        "by_status": {
            "todo": todo_tasks,
            "in_progress": in_progress_tasks,
            "completed": completed_tasks
        },
        "overdue_tasks": overdue_tasks,
        "due_today": due_today,
        "completed_today": completed_today,
        "completed_this_week": completed_this_week,
        "completed_this_month": completed_this_month,
        "fitness_tasks": {
            "total": fitness_tasks,
            "completed": fitness_tasks_completed,
            "pending": fitness_tasks - fitness_tasks_completed
        },
        "task_streak_days": task_streak
    }

# Fitness integration endpoints
@api_router.get("/tasks/fitness-suggestions")
async def get_fitness_suggestions(current_user: dict = Depends(get_current_user)):
    """Get AI-powered fitness task suggestions based on user's progress"""
    user_id = str(current_user["_id"])
    suggestions = []
    
    # Get user stats
    total_workouts = await db.workout_sessions.count_documents({
        "user_id": user_id,
        "is_completed": True
    })
    
    # Count workouts this week
    now = datetime.utcnow()
    start_of_week = now - timedelta(days=7)
    workouts_this_week = await db.workout_sessions.count_documents({
        "user_id": user_id,
        "is_completed": True,
        "session_date": {"$gte": start_of_week}
    })
    
    current_streak = current_user.get("current_streak_days", 0)
    total_prs = await db.personal_records.count_documents({"user_id": user_id})
    
    # Get unlocked achievements
    unlocked_achievements = await db.user_achievements.count_documents({"user_id": user_id})
    total_achievements = await db.achievements.count_documents({})
    
    # Suggestion 1: Weekly workout goal
    if workouts_this_week < 3:
        suggestions.append({
            "id": "workout_weekly_goal",
            "title": f"Completar {3 - workouts_this_week} workout{'s' if (3-workouts_this_week) > 1 else ''} más esta semana",
            "description": f"Te faltan {3 - workouts_this_week} entrenamientos para alcanzar tu meta semanal de 3 workouts",
            "priority": "high",
            "category": "fitness",
            "linked_to_fitness": True,
            "fitness_link_type": "workout_goal",
            "fitness_metadata": {
                "workouts_per_week": 3,
                "current_progress": workouts_this_week
            },
            "icon": "💪"
        })
    
    # Suggestion 2: Maintain streak
    if current_streak > 0 and current_streak < 7:
        suggestions.append({
            "id": "maintain_streak",
            "title": f"Mantener racha de {current_streak} días",
            "description": f"¡Vas {current_streak} días seguidos! Completa un workout hoy para mantener tu racha",
            "priority": "urgent",
            "category": "fitness",
            "linked_to_fitness": True,
            "fitness_link_type": "workout_goal",
            "fitness_metadata": {
                "workouts_per_week": 7,
                "streak_goal": True
            },
            "icon": "🔥"
        })
    
    # Suggestion 3: Break personal record
    recent_prs = await db.personal_records.find({
        "user_id": user_id
    }).sort("achieved_at", -1).limit(3).to_list(3)
    
    for pr in recent_prs:
        exercise = await db.exercises.find_one({"_id": ObjectId(pr["exercise_id"])})
        if exercise and pr["pr_type"] == "MAX_WEIGHT":
            target_weight = pr["value"] * 1.025  # 2.5% increase
            suggestions.append({
                "id": f"pr_goal_{pr['exercise_id']}",
                "title": f"Superar PR en {exercise['name']}",
                "description": f"Tu récord actual es {pr['value']}kg. Intenta alcanzar {round(target_weight, 1)}kg",
                "priority": "medium",
                "category": "fitness",
                "linked_to_fitness": True,
                "fitness_link_type": "pr_goal",
                "fitness_metadata": {
                    "exercise_id": pr["exercise_id"],
                    "target_weight": round(target_weight, 1),
                    "current_pr": pr["value"]
                },
                "icon": "🏆"
            })
            break  # Only suggest one PR goal
    
    # Suggestion 4: Unlock achievements
    if unlocked_achievements < total_achievements:
        pending_achievements = total_achievements - unlocked_achievements
        
        # Get next unlockable achievement
        all_achievements = await db.achievements.find({}).to_list(100)
        user_achievement_ids = [
            ua["achievement_id"] 
            for ua in await db.user_achievements.find({"user_id": user_id}).to_list(100)
        ]
        
        for achievement in all_achievements:
            if str(achievement["_id"]) not in user_achievement_ids:
                criteria = achievement.get("criteria", {})
                
                # Check if it's close to unlocking
                if "workouts_completed" in criteria:
                    if total_workouts >= criteria["workouts_completed"] * 0.8:
                        suggestions.append({
                            "id": f"achievement_{achievement['code']}",
                            "title": f"Desbloquear '{achievement['name']}'",
                            "description": f"{achievement['description']} ({total_workouts}/{criteria['workouts_completed']} workouts)",
                            "priority": "low",
                            "category": "fitness",
                            "linked_to_fitness": True,
                            "fitness_link_type": "achievement_goal",
                            "fitness_metadata": {
                                "achievement_code": achievement["code"],
                                "current_progress": total_workouts,
                                "target": criteria["workouts_completed"]
                            },
                            "icon": "🎖️"
                        })
                        break
    
    # Suggestion 5: Try new routine
    user_routines = await db.routines.count_documents({"user_id": user_id})
    if user_routines < 3:
        suggestions.append({
            "id": "create_routine",
            "title": "Crear una nueva rutina de entrenamiento",
            "description": "Organiza tus workouts creando una rutina personalizada",
            "priority": "low",
            "category": "fitness",
            "linked_to_fitness": True,
            "fitness_link_type": "routine_reminder",
            "fitness_metadata": {},
            "icon": "📋"
        })
    
    return {
        "suggestions": suggestions[:5],  # Max 5 suggestions
        "user_stats": {
            "total_workouts": total_workouts,
            "workouts_this_week": workouts_this_week,
            "current_streak": current_streak,
            "total_prs": total_prs,
            "unlocked_achievements": unlocked_achievements,
            "total_achievements": total_achievements
        }
    }

@api_router.post("/tasks/check-fitness-progress")
async def check_fitness_task_progress(current_user: dict = Depends(get_current_user)):
    """Check and auto-update progress for fitness-linked tasks"""
    user_id = str(current_user["_id"])
    updated_tasks = []
    
    # Get all fitness-linked tasks that are not completed
    fitness_tasks = await db.tasks.find({
        "user_id": user_id,
        "linked_to_fitness": True,
        "completed": False
    }).to_list(100)
    
    now = datetime.utcnow()
    
    # Calculate start of CURRENT week (Monday 00:00:00)
    days_since_monday = now.weekday()  # Monday = 0, Sunday = 6
    start_of_week = (now - timedelta(days=days_since_monday)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    
    logger.info(f"Checking fitness progress for {len(fitness_tasks)} tasks")
    
    for task in fitness_tasks:
        fitness_type = task.get("fitness_link_type")
        metadata = task.get("fitness_metadata", {})
        should_complete = False
        
        # IMPORTANT: Only auto-complete if task is not overdue or due date hasn't passed yet
        task_due_date = task.get("due_date")
        if task_due_date:
            # Convert to datetime if it's a string
            if isinstance(task_due_date, str):
                task_due_date = datetime.fromisoformat(task_due_date.replace('Z', '+00:00'))
            
            # Only auto-complete if we're still within the due date (same day or before)
            end_of_due_day = task_due_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            if now > end_of_due_day:
                # Task is overdue, don't auto-complete
                logger.info(f"Task {task['_id']} is overdue ({task_due_date}), skipping")
                continue
        
        if fitness_type == "workout_goal":
            # Check if workout goal is met
            target_workouts = metadata.get("workouts_per_week")
            
            # Validate metadata
            if not target_workouts or target_workouts <= 0:
                logger.warning(f"Task {task['_id']} has invalid workouts_per_week: {target_workouts}")
                continue
            
            # IMPORTANT: Only count workouts AFTER the task was created
            task_created_at = task.get("created_at")
            
            # Build query to only count workouts after task creation AND this week
            workout_query = {
                "user_id": user_id,
                "is_completed": True,
                "session_date": {"$gte": max(start_of_week, task_created_at)}  # Use the later date
            }
            
            workouts = await db.workout_sessions.find(workout_query).to_list(100)
            
            workouts_this_week = len(workouts)
            
            if workouts_this_week >= target_workouts:
                should_complete = True
        
        elif fitness_type == "pr_goal":
            # Check if PR goal is met
            exercise_id = metadata.get("exercise_id")
            target_weight = metadata.get("target_weight")
            
            # Validate metadata
            if not exercise_id or not target_weight or target_weight <= 0:
                logger.warning(f"Task {task['_id']} has invalid PR metadata: exercise={exercise_id}, weight={target_weight}")
                continue
            
            current_pr = await db.personal_records.find_one({
                "user_id": user_id,
                "exercise_id": exercise_id,
                "pr_type": "MAX_WEIGHT"
            })
            
            if current_pr:
                current_weight = current_pr.get("value", 0)
                logger.info(f"Task {task['_id']}: PR check - current: {current_weight}kg, target: {target_weight}kg")
                
                if current_weight >= target_weight:
                    logger.info(f"Task {task['_id']}: PR goal achieved! Auto-completing.")
                    should_complete = True
            else:
                logger.info(f"Task {task['_id']}: No PR found for exercise {exercise_id}, cannot auto-complete yet")
        
        elif fitness_type == "achievement_goal":
            # Check if achievement is unlocked
            achievement_code = metadata.get("achievement_code")
            
            # Validate metadata
            if not achievement_code:
                logger.warning(f"Task {task['_id']} has no achievement_code")
                continue
            
            achievement = await db.achievements.find_one({"code": achievement_code})
            if achievement:
                user_achievement = await db.user_achievements.find_one({
                    "user_id": user_id,
                    "achievement_id": str(achievement["_id"])
                })
                
                if user_achievement:
                    logger.info(f"Task {task['_id']}: Achievement {achievement_code} unlocked")
                    should_complete = True
        
        # Auto-complete if goal is met
        if should_complete:
            logger.info(f"Auto-completing task {task['_id']} - {task['title']} (Type: {fitness_type})")
            await db.tasks.update_one(
                {"_id": task["_id"]},
                {
                    "$set": {
                        "completed": True,
                        "status": "completed",
                        "completed_at": now,
                        "updated_at": now
                    }
                }
            )
            
            updated_tasks.append({
                "task_id": str(task["_id"]),
                "title": task["title"],
                "auto_completed": True
            })
    
    return {
        "updated_tasks": updated_tasks,
        "count": len(updated_tasks),
        "message": f"Auto-completed {len(updated_tasks)} fitness task(s)"
    }

@api_router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific task"""
    task = await db.tasks.find_one({
        "_id": ObjectId(task_id),
        "user_id": str(current_user["_id"])
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return TaskResponse(
        id=str(task["_id"]),
        user_id=task["user_id"],
        title=task["title"],
        description=task.get("description"),
        completed=task.get("completed", False),
        priority=task.get("priority", "medium"),
        status=task.get("status", "todo"),
        created_at=task["created_at"],
        updated_at=task["updated_at"],
        due_date=task.get("due_date"),
        completed_at=task.get("completed_at"),
        category=task.get("category"),
        tags=task.get("tags", []),
        is_recurring=task.get("is_recurring", False),
        recurrence_pattern=task.get("recurrence_pattern"),
        recurrence_days=task.get("recurrence_days", []),
        subtasks=[Subtask(**s) for s in task.get("subtasks", [])],
        linked_to_fitness=task.get("linked_to_fitness", False),
        fitness_link_type=task.get("fitness_link_type"),
        fitness_metadata=FitnessMetadata(**task["fitness_metadata"]) if task.get("fitness_metadata") else None,
        reminder_enabled=task.get("reminder_enabled", False),
        reminder_time=task.get("reminder_time"),
        order=task.get("order", 0)
    )

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a task"""
    task = await db.tasks.find_one({
        "_id": ObjectId(task_id),
        "user_id": str(current_user["_id"])
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Build update dict with only provided fields
    update_dict = {"updated_at": datetime.utcnow()}
    
    if task_data.title is not None:
        update_dict["title"] = task_data.title
    if task_data.description is not None:
        update_dict["description"] = task_data.description
    if task_data.priority is not None:
        update_dict["priority"] = task_data.priority
    if task_data.status is not None:
        update_dict["status"] = task_data.status
    if task_data.due_date is not None:
        update_dict["due_date"] = task_data.due_date
    if task_data.category is not None:
        update_dict["category"] = task_data.category
    if task_data.tags is not None:
        update_dict["tags"] = task_data.tags
    if task_data.is_recurring is not None:
        update_dict["is_recurring"] = task_data.is_recurring
    if task_data.recurrence_pattern is not None:
        update_dict["recurrence_pattern"] = task_data.recurrence_pattern
    if task_data.recurrence_days is not None:
        update_dict["recurrence_days"] = task_data.recurrence_days
    if task_data.subtasks is not None:
        update_dict["subtasks"] = [s.dict() for s in task_data.subtasks]
    if task_data.linked_to_fitness is not None:
        update_dict["linked_to_fitness"] = task_data.linked_to_fitness
    if task_data.fitness_link_type is not None:
        update_dict["fitness_link_type"] = task_data.fitness_link_type
    if task_data.fitness_metadata is not None:
        update_dict["fitness_metadata"] = task_data.fitness_metadata.dict()
    if task_data.reminder_enabled is not None:
        update_dict["reminder_enabled"] = task_data.reminder_enabled
    if task_data.reminder_time is not None:
        update_dict["reminder_time"] = task_data.reminder_time
    if task_data.order is not None:
        update_dict["order"] = task_data.order
    
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_dict}
    )
    
    logger.info(f"Updated task {task_id}")
    
    return await get_task(task_id, current_user)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a task"""
    task = await db.tasks.find_one({
        "_id": ObjectId(task_id),
        "user_id": str(current_user["_id"])
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.tasks.delete_one({"_id": ObjectId(task_id)})
    
    logger.info(f"Deleted task {task_id}")
    
    return {"success": True, "message": "Task deleted successfully"}

@api_router.patch("/tasks/{task_id}/toggle", response_model=TaskResponse)
async def toggle_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Toggle task completed status"""
    task = await db.tasks.find_one({
        "_id": ObjectId(task_id),
        "user_id": str(current_user["_id"])
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    new_completed = not task.get("completed", False)
    new_status = "completed" if new_completed else "todo"
    completed_at = datetime.utcnow() if new_completed else None
    
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "completed": new_completed,
                "status": new_status,
                "completed_at": completed_at,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    logger.info(f"Toggled task {task_id} to completed={new_completed}")
    
    return await get_task(task_id, current_user)

# Subtasks endpoints
@api_router.post("/tasks/{task_id}/subtasks")
async def add_subtask(
    task_id: str,
    subtask_data: SubtaskCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a subtask to a task"""
    task = await db.tasks.find_one({
        "_id": ObjectId(task_id),
        "user_id": str(current_user["_id"])
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Generate new subtask
    new_subtask = {
        "id": str(uuid.uuid4()),
        "title": subtask_data.title,
        "completed": False
    }
    
    # Add to subtasks array
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$push": {"subtasks": new_subtask},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    logger.info(f"Added subtask to task {task_id}")
    
    return new_subtask

@api_router.patch("/tasks/{task_id}/subtasks/{subtask_id}/toggle")
async def toggle_subtask(
    task_id: str,
    subtask_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Toggle subtask completed status"""
    task = await db.tasks.find_one({
        "_id": ObjectId(task_id),
        "user_id": str(current_user["_id"])
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    subtasks = task.get("subtasks", [])
    subtask_found = False
    
    for subtask in subtasks:
        if subtask["id"] == subtask_id:
            subtask["completed"] = not subtask.get("completed", False)
            subtask_found = True
            break
    
    if not subtask_found:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "subtasks": subtasks,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    logger.info(f"Toggled subtask {subtask_id} in task {task_id}")
    
    return {"success": True, "subtasks": subtasks}

@api_router.delete("/tasks/{task_id}/subtasks/{subtask_id}")
async def delete_subtask(
    task_id: str,
    subtask_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a subtask"""
    task = await db.tasks.find_one({
        "_id": ObjectId(task_id),
        "user_id": str(current_user["_id"])
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Remove subtask from array
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$pull": {"subtasks": {"id": subtask_id}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    logger.info(f"Deleted subtask {subtask_id} from task {task_id}")
    
    return {"success": True, "message": "Subtask deleted successfully"}

# ==================== ROOT ====================

# DEBUG ENDPOINTS - Uncomment for development/testing
# @api_router.get("/debug/workout-count")
# async def count_workouts(current_user: dict = Depends(get_current_user)):
#     """Check how many workouts exist this week"""
#     # Implementation commented out - see git history

# @api_router.delete("/debug/clear-workouts")
# async def clear_all_workouts(current_user: dict = Depends(get_current_user)):
#     """🚨 DEBUG: Delete all workout sessions for current user"""
#     # Implementation commented out - see git history

@api_router.get("/")
async def root():
    return {"message": "ToDoApp Plus - Fitness API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint with MongoDB connection verification"""
    try:
        # Test MongoDB connection
        await db.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "message": "API and database are operational"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"Service unavailable: Database connection failed - {str(e)}"
        )

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    """Verify database connection on startup"""
    try:
        await db.command('ping')
        logger.info(f"Successfully connected to MongoDB at {MONGO_URL}")
        logger.info(f"Using database: {DB_NAME}")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        logger.error("Please ensure MongoDB is running and MONGO_URL is correct")
        raise RuntimeError(f"Database connection failed: {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
