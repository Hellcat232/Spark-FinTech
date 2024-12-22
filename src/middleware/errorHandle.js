const errorHandle = (err, req, res, next) => {
  const { status = 500, message } = err;

  // const response = {
  //   status,
  //   success: false,
  //   message: status === 500 ? 'Internal server error' : message,
  // };

  res.status(status).json({
    message: message,
    error: message,
    data: err,
  });

  // res.status(status).json(response);
};

export default errorHandle;
