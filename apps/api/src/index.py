from fastapi import FastAPI

app = FastAPI(
    title="ckpt API",
    description="The reasoning layer for every code change",
    version="0.1.0",
)


@app.get("/")
def root():
    return {"status": "ok", "service": "ckpt-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}
