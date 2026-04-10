const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema(
  {
    apiUrl: {
      type: String,
      required: true,
      trim: true
    },
    httpMethod: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      required: true
    },
    requestHeaders: {
      type: Object,
      default: {}
    },
    requestBody: {
      type: Object,
      default: null
    },
    responseStatus: {
      type: Number,
      required: true
    },
    responseData: {
      type: Object,
      default: null
    },
    responseTime: {
      type: Number,
      required: true,
      description: 'Response time in milliseconds'
    },
    isSlowAPI: {
      type: Boolean,
      default: false
    },
    slowThreshold: {
      type: Number,
      default: 2000
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

// Index for faster queries
testResultSchema.index({ apiUrl: 1, timestamp: -1 });
testResultSchema.index({ responseTime: -1 });
testResultSchema.index({ isSlowAPI: 1 });

const MongoModel = mongoose.model('TestResult', testResultSchema);

// ─── In-memory fallback store ───────────────────────────────────────────────
class InMemoryStore {
  constructor() {
    this._data = [];
    this._idCounter = 0;
  }

  _match(doc, query) {
    return Object.entries(query).every(([key, val]) => {
      if (val && typeof val === 'object' && (val.$gte || val.$lt)) {
        const docVal = new Date(doc[key]);
        if (val.$gte && docVal < new Date(val.$gte)) return false;
        if (val.$lt && docVal < new Date(val.$lt)) return false;
        return true;
      }
      return doc[key] === val;
    });
  }

  async save(doc) {
    const record = {
      _id: String(++this._idCounter),
      ...doc,
      timestamp: doc.timestamp || new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this._data.push(record);
    return record;
  }

  find(query = {}) {
    const self = this;
    let results = self._data.filter(d => self._match(d, query));
    const chain = {
      sort(sortObj) {
        const [field, dir] = Object.entries(sortObj)[0];
        results.sort((a, b) => {
          const va = a[field], vb = b[field];
          if (va < vb) return dir === -1 ? 1 : -1;
          if (va > vb) return dir === -1 ? -1 : 1;
          return 0;
        });
        return chain;
      },
      limit(n) {
        results = results.slice(0, n);
        return chain;
      },
      lean() {
        return chain;
      },
      then(resolve, reject) {
        try { resolve(results); } catch (e) { reject(e); }
      }
    };
    return chain;
  }

  async deleteMany(query = {}) {
    const before = this._data.length;
    this._data = this._data.filter(d => !this._match(d, query));
    return { deletedCount: before - this._data.length };
  }
}

// ─── Proxy that auto-selects Mongo or in-memory ─────────────────────────────
function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

const memStore = new InMemoryStore();

const TestResult = new Proxy(MongoModel, {
  construct(target, args) {
    // `new TestResult({...})` — always returns a Mongoose doc so `.save()` works
    // but we wrap save to fall back to in-memory
    const doc = new target(...args);
    const origSave = doc.save.bind(doc);
    doc.save = async function () {
      if (isMongoConnected()) {
        return origSave();
      }
      return memStore.save(doc.toObject());
    };
    return doc;
  },
  get(target, prop) {
    if (prop === 'find') {
      return (...args) => {
        if (isMongoConnected()) return target.find(...args);
        return memStore.find(...args);
      };
    }
    if (prop === 'deleteMany') {
      return (...args) => {
        if (isMongoConnected()) return target.deleteMany(...args);
        return memStore.deleteMany(...args);
      };
    }
    return target[prop];
  }
});

module.exports = TestResult;
