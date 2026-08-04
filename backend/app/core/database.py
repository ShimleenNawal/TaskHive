from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

db_url = "postgresql://mlbd@localhost:5432/taskhive" # specify dbms type, port number
engine = create_engine(db_url) # helps to connect to db 
SessionLocal = sessionmaker(autocommit = False, autoflush = False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal() # create a connection to database 
    try:
        yield db # waiting for others to use it 
    finally:
        db.close() # makes sure to close the connection even if error

