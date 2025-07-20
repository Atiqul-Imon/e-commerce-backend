class ApiFeatures {
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  search() {
    const keyword = this.queryStr.keyword
      ? {
          $or: [
            {
              name: {
                $regex: this.queryStr.keyword,
                $options: 'i'
              }
            },
            {
              description: {
                $regex: this.queryStr.keyword,
                $options: 'i'
              }
            },
            {
              brand: {
                $regex: this.queryStr.keyword,
                $options: 'i'
              }
            }
          ]
        }
      : {};

    this.query = this.query.find({ ...keyword });
    return this;
  }

  filter() {
    const queryCopy = { ...this.queryStr };
    
    // Remove fields from query
    const removeFields = ['keyword', 'limit', 'page', 'sort'];
    removeFields.forEach(el => delete queryCopy[el]);

    // Advanced filter for price, ratings etc
    let queryStr = JSON.stringify(queryCopy);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  pagination(resPerPage) {
    const currentPage = Number(this.queryStr.page) || 1;
    const skip = resPerPage * (currentPage - 1);

    this.query = this.query.limit(resPerPage).skip(skip);
    return this;
  }

  sort() {
    if (this.queryStr.sort) {
      const sortBy = this.queryStr.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  select() {
    if (this.queryStr.select) {
      const fields = this.queryStr.select.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  populate(options) {
    if (this.queryStr.populate) {
      this.query = this.query.populate(options);
    }
    return this;
  }
}

export default ApiFeatures; 