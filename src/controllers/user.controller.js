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

    const transformedUsers = users.map((user) => ({
      _id: user._id,
      name: user.name,
    }));

    const populatedUsers = await Promise.all(
      transformedUsers.map(async (user) => {
        const posts = await Post.find({ userId: user._id }).lean().exec();
        user.posts = posts.length;
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
