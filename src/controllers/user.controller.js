// const User = require("../schema/user.schema");

// // const Post = require("../models/post.model");


// module.exports.getUsersWithPostCount = async (req, res) => {
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 10;
//   const skip = (page - 1) * limit;

//   try {
//     const [users, totalDocs] = await Promise.all([
//       User.find()
//         .skip(skip)
//         .limit(limit)
//         .lean()
//         .exec(),
//       User.countDocuments().exec()
//     ]);
    
//     const userIds = users.map((user) => user._id);
//     const postCounts = await User.aggregate([
//       { $match: { user: { $in: userIds } } },
//       { $group: { _id: "$user", count: { $sum: 1 } } }
//     ]);

//     const userMap = new Map();
//     users.forEach((user) => userMap.set(user._id.toString(), user));

//     postCounts.forEach((count) => {
//       const user = userMap.get(count._id.toString());
//       if (user) {
//         user.postCount = count.count;
//       }
//     });

//     const totalPages = Math.ceil(totalDocs / limit);
//     const hasNextPage = page < totalPages;
//     const hasPrevPage = page > 1;
//     const pagingCounter = (page - 1) * limit + 1;
//     const prevPage = hasPrevPage ? page - 1 : null;
//     const nextPage = hasNextPage ? page + 1 : null;

//     const pagination = {
//       totalDocs,
//       limit,
//       page,
//       totalPages,
//       pagingCounter,
//       hasNextPage,
//       hasPrevPage,
//       prevPage,
//       nextPage
//     };

//     res.status(200).json({
//       data: {
//         users, 
//         pagination
//       }
//     });
//   } catch (error) {
//     console.log("found error", error);

//     res.status(500).json({error: "Internal server error"});
//   }
// };



// const User = require("../schema/user.schema");

const User = require("../schema/user.schema");
const Post = require("../schema/post.schema");

module.exports.getUsersWithPostCount = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const [users, totalDocs] = await Promise.all([
      User.find()
        .skip(skip)
        .limit(limit)
        .lean()
        .select("-__v")
        .exec(),
      User.countDocuments().exec()
    ]);

    const userIds = users.map((user) => user._id);

    const userAgg = await User.aggregate([
      {
        $lookup: {
          from: "posts",
          let: { userId: "$_id" },
          pipeline: [
             { "$addFields": { "userId": { "$toObjectId": "$userId" }}},
             { $match: { $expr: { $eq: ["$$userId", "$$userId"] } } },
             { $limit : 5 },
             { $project: { __v: 0 } }
          ],
          as: "posts_count",
        },
      },
      { $addFields: { posts_count: { $size: "$posts_count" } } },
      { $project: { __v: 0 } }
    ]);

     console.log(userAgg)

    const postCounts = await Post.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: "$user", count: { $sum: 1 } } }
    ]);

    // const userMap = new Map();
    // users.forEach((user) => userMap.set(user._id.toString(), user));

    // postCounts.forEach((count) => {
    //   const user = userMap.get(count._id.toString());
    //   if (user) {
    //     user.postCount = count.count;
    //   }
    // });

    const postCountsMap = new Map();
    postCounts.forEach((count) => {
      postCountsMap.set(count._id.toString(), count.count);
    });

    const transformedUsers = users.map((user) => ({
      _id: user._id,
      name: user.name,
      posts: postCountsMap.get(user._id.toString()) || 0
    }));

    const populatedUsers = await Promise.all(
      transformedUsers.map(async (user) => {
        const posts = await Post.find({ user: user._id }).lean().exec();
        user.posts = posts;
        return user;
      })
    );

    const totalPages = Math.ceil(totalDocs / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    const pagingCounter = (page - 1) * limit + 1;
    const prevPage = hasPrevPage ? page - 1 : null;
    const nextPage = hasNextPage ? page + 1 : null;

    const pagination = {
      totalDocs,
      limit,
      page,
      totalPages,
      pagingCounter,
      hasNextPage,
      hasPrevPage,
      prevPage,
      nextPage
    };

    res.status(200).json({
      data: {
        users: populatedUsers,
        pagination
      }
    });
  } catch (error) {
    console.log("found error", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
