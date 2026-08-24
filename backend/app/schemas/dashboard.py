from pydantic import BaseModel


class DashboardStatsOut(BaseModel):
    total: int
    in_progress: int
    completed: int
