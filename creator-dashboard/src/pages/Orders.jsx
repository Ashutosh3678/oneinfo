
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../lib/axios';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const query = `
          query {
            myOrders(limit: 50, page: 1) {
              orders {
                orderId
                productName
                orderValue
                creatorCommissionAmount
                status
                platform
                createdAt
              }
            }
          }
        `;
        const res = await api.post('/graphql', { query });
        setOrders(res.data.data.myOrders.orders);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'declined': return 'bg-red-100 text-red-700';
      case 'paid': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <div className="ml-64 p-8 w-full">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">Order History</h1>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-4 font-semibold text-slate-600">Date</th>
                <th className="p-4 font-semibold text-slate-600">Product</th>
                <th className="p-4 font-semibold text-slate-600">Order ID</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Value</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Commission</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.orderId} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-500">{new Date(parseInt(order.createdAt)).toLocaleDateString()}</td>
                  <td className="p-4 text-slate-800 font-medium">{order.productName || 'Product'}</td>
                  <td className="p-4 font-mono text-xs text-slate-400">{order.orderId}</td>
                  <td className="p-4 text-right text-slate-600">₹{order.orderValue}</td>
                  <td className="p-4 text-right font-bold text-green-600">+₹{order.creatorCommissionAmount.toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && !loading && (
                <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">No orders found yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Orders;
