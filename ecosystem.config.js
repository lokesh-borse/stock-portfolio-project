module.exports = {
  apps: [
    {
      name: "stock-backend",
      script: "venv/bin/python",
      args: "backend/manage.py runserver 0.0.0.0:8001",
      cwd: "/home/azure/stock-portfolio-project"
    }
  ]
};
