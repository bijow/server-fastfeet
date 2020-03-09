import * as Yup from 'yup';
import {
  parseISO,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
  setSeconds,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { Op } from 'sequelize';
import Delivery from '../models/Delivery';
import Recipient from '../models/Recipient';
import Deliveryman from '../models/Deliveryman';

class DeliveryStatusController {
  async index(req, res) {
    const schema = Yup.object().shape({
      deliveryman_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { page = 1 } = req.query;

    // Check if deliveryman exists

    const { deliveryman_id } = req.body;

    const deliverymanExists = await Deliveryman.findOne({
      where: { id: req.body.deliveryman_id },
    });

    if (!deliverymanExists) {
      return res.status(400).json({ error: 'Deliveryman does not exist' });
    }

    const deliveries = await Delivery.findAll({
      where: { deliveryman_id, end_date: null, canceled_at: null },
      order: ['id'],
      attributes: ['id', 'product', 'created_at'],
      include: [
        {
          model: Recipient,
          as: 'recipient',
          attributes: [
            'name',
            'street',
            'number',
            'complement',
            'state',
            'city',
            'zip_code',
          ],
        },
      ],
      limit: 10,
      offset: (page - 1) * 10,
    });

    return res.json(deliveries);
  }

  async show(req, res) {
    const { page = 1 } = req.query;

    // Check deliveryman exists?

    const { id } = req.params;

    const deliverymanExists = await Deliveryman.findOne({
      where: { id },
    });

    if (!deliverymanExists) {
      return res.status(400).json({ error: 'Deliveryman does not exist' });
    }
    const deliveriesConcluded = await Delivery.findAll({
      where: {
        deliveryman_id: id,
        end_date: {
          [Op.ne]: null,
        },
      },
      order: ['id'],
      attributes: ['id', 'product', 'created_at', 'start_date', 'end_date'],
      include: [
        {
          model: Recipient,
          as: 'recipient',
          attributes: [
            'name',
            'street',
            'number',
            'complement',
            'state',
            'city',
            'zip_code',
          ],
        },
      ],
      limit: 10,
      offset: (page - 1) * 10,
    });

    return res.json(deliveriesConcluded);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      id: Yup.number().required(),
      start_date: Yup.date(),
      end_date: Yup.date(),
      signature_id: Yup.number().when('end_date', (end_date, field) =>
        end_date ? field.required() : field
      ),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    // Check if delivery exists

    const { id } = req.body;

    const deliveryExists = await Delivery.findOne({
      where: { id },
    });

    if (!deliveryExists) {
      return res.status(400).json({ error: 'Delivery does not exist' });
    }

    const { deliveryman_id } = req.params;

    const deliverymanExists = await Deliveryman.findOne({
      where: { id: deliveryman_id },
    });

    if (!deliverymanExists) {
      return res.status(400).json({ error: 'Deliveryman does not exist' });
    }
    const deliveryBelongsDeliveryman = await Delivery.findOne({
      where: { id, deliveryman_id },
    });

    if (!deliveryBelongsDeliveryman) {
      return res
        .status(400)
        .json({ error: 'Delivery does not belong deliveryman' });
    }

    const startDate = parseISO(req.body.start_date);

    const endDate = parseISO(req.body.end_date);

    const startWork = setSeconds(setMinutes(setHours(startDate, 8), 0), 0);

    const endWork = setSeconds(setMinutes(setHours(endDate, 18), 0), 0);

    if (isBefore(startDate, startWork) || isAfter(endDate, endWork)) {
      return res
        .status(400)
        .json({ erro: 'The access is only permited between 08:00 and 18:00' });
    }
    if (isBefore(startDate, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permited ' });
    }

    if (isBefore(endDate, startDate)) {
      return res.status(400).json({
        error: 'Conclusion date must be after start date',
      });
    }

    const deliveriesDay = await Delivery.findAll({
      where: {
        deliveryman_id,
        start_date: {
          [Op.between]: [startOfDay(startDate), endOfDay(startDate)],
        },
      },
    });

    if (deliveriesDay.length >= 5) {
      return res
        .status(400)
        .json({ error: 'You can pickup at most 5 deliveries per day' });
    }

    const data = await deliveryExists.update(req.body);

    return res.json(data);
  }
}

export default new DeliveryStatusController();
