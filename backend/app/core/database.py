from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
engine = create_engine(db_url) # helps to connect to db 
SessionLocal = sessionmaker(autocommit = False, autoflush = False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal() # create a connection to database 
    try:
        yield db # waiting for others to use it 
    finally:
        db.close() # makes sure to close the connection even if error

