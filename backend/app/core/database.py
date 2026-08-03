from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

db_url = "postgresql://mlbd@localhost:5432/taskhive" # specify dbms type, port number
engine = create_engine(db_url) # helps to connect to db 
SessionLocal = sessionmaker(autocommit = False, autoflush = False, bind=engine)

Base = declarative_base()


