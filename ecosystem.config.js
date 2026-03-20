module.exports = {
  apps: [
    {
<<<<<<< Updated upstream
      name: "backend",
      script: "venv/bin/python",
      args: "backend/manage.py runserver 0.0.0.0:8000",
      cwd: "/home/azure/stock-portfolio-project"
    },
    {
      name: "frontend",
      script: "npm",
      args: "run dev",
      cwd: "/home/azure/stock-portfolio-project/frontend"
=======
      name: "stock-backend",
      script: "venv/bin/python",
      args: "backend/manage.py runserver 0.0.0.0:8001",
      cwd: "/home/azure/stock-portfolio-project"
>>>>>>> Stashed changes
    }
  ]
};
