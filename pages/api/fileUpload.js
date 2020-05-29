export default (req, res) => {
    if (req.method === 'POST') {
        res.status(200).json(req);
    } else {
        console.log('Making an invalid request')
    }
}