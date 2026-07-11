import numpy as np
import pickle
from sklearn.ensemble import IsolationForest

np.random.seed(42)
normal = np.random.normal(loc=[0.2, 80, 5], scale=[0.1, 20, 2], size=(1000, 3))
anomaly = np.random.normal(loc=[0.8, 120, 15], scale=[0.1, 20, 5], size=(50, 3))
X = np.vstack([normal, anomaly])
model = IsolationForest(contamination=0.05, random_state=42)
model.fit(X)
with open('model.pkl', 'wb') as f:
    pickle.dump(model, f)
print("Model saved to model.pkl")