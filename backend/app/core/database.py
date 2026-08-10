from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings 

db_url = settings.DATABASE_URL
engine = create_engine(db_url) # helps to connect to db 
SessionLocal = sessionmaker(autocommit = False, autoflush = False, bind=engine)

Base = declarative_base()


